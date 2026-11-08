package com.momentum.app.data.remote

import com.momentum.app.domain.model.FourTilesResult
import com.momentum.app.domain.model.MonthlyReportResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class GeminiMessage(
    val role: String, // "user" or "model"
    val content: String
)

/**
 * Real Gemini API Client for Momentum Android App
 * Communicates directly with the official Google Gemini API using model: gemini-3.8-flash.
 * Strictly avoids mock responses, local synthetic AI, or placeholder chat.
 */
class GeminiApiClient(
    private var apiKeyProvider: () -> String? = { null }
) {
    companion object {
        private const val MODEL_NAME = "gemini-3.8-flash"
        private const val API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
    }

    suspend fun generateReportAdvice(
        historyMessages: List<GeminiMessage>,
        fourTiles: FourTilesResult,
        monthStats: MonthlyReportResult?
    ): Result<String> = withContext(Dispatchers.IO) {
        val apiKey = apiKeyProvider()?.trim()
        if (apiKey.isNullOrEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("GEMINI_API_KEY is not configured. Please supply a valid Gemini API key in Settings or environment secrets.")
            )
        }

        try {
            val urlString = "$API_BASE_URL/$MODEL_NAME:generateContent?key=$apiKey"
            val url = URL(urlString)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 25000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("User-Agent", "aistudio-build-android")
            }

            // Construct System Instruction & Context
            val contextJson = JSONObject().apply {
                put("dailyCompletionRate", fourTiles.dailyCompletionRate)
                put("dailyCompleted", fourTiles.dailyCompletedCount)
                put("dailyTotal", fourTiles.dailyTotalCount)
                put("weeklyCompletionRate", fourTiles.weeklyCompletionRate)
                put("weeklyCompleted", fourTiles.weeklyCompletedCount)
                put("weeklyTotal", fourTiles.weeklyTotalCount)
                put("monthlyCompletionRate", fourTiles.monthlyCompletionRate)
                put("monthlyCompleted", fourTiles.monthlyCompletedCount)
                put("monthlyTotal", fourTiles.monthlyTotalCount)
                put("unfinishedCount", fourTiles.unfinishedCount)
                put("unfinishedPresent1", fourTiles.unfinishedByPriority.present1)
                put("unfinishedPresent5", fourTiles.unfinishedByPriority.present5)
                put("unfinishedLater1", fourTiles.unfinishedByPriority.later1)
                put("unfinishedLater5", fourTiles.unfinishedByPriority.later5)
                monthStats?.let {
                    put("reconstructedMonthCompletionRate", it.completionRate)
                    put("reconstructedMonthCreated", it.tasksCreated)
                    put("reconstructedMonthCompleted", it.tasksCompleted)
                    put("reconstructedMonthUnfinished", it.unfinishedTasks)
                }
            }

            val systemInstructionText = """
                You are Momentum Productivity Advisor, an insightful AI assistant powered by Gemini 3.8 Flash inside the Momentum Android app.
                You analyze productivity statistics, completion rates, unfinished tasks, bottlenecks, and task history.
                Momentum's priority system consists strictly of four tiers:
                1. Present 1 (Top Focus / Urgent & Critical)
                2. Present 5 (Current Sprint / Standard execution)
                3. Later 1 (Deferred / High Strategic Value)
                4. Later 5 (Backlog / Low Urgency)

                Live user performance context:
                $contextJson

                Provide concise, empowering, data-driven advice. Highlight achievements, point out risks if high-priority tasks (Present 1) are unfinished or postponed, and suggest tactical next steps. Use clean text formatting.
            """.trimIndent()

            val requestBody = JSONObject().apply {
                // System Instruction
                put("systemInstruction", JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply { put("text", systemInstructionText) })
                    })
                })

                // Contents array
                val contentsArray = JSONArray()
                for (msg in historyMessages) {
                    val role = if (msg.role == "assistant" || msg.role == "model") "model" else "user"
                    contentsArray.put(JSONObject().apply {
                        put("role", role)
                        put("parts", JSONArray().apply {
                            put(JSONObject().apply { put("text", msg.content) })
                        })
                    })
                }
                put("contents", contentsArray)
            }

            // Write payload
            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(requestBody.toString())
                writer.flush()
            }

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val responseText = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8")).use { reader ->
                    reader.readText()
                }
                val json = JSONObject(responseText)
                val candidates = json.optJSONArray("candidates")
                if (candidates != null && candidates.length() > 0) {
                    val candidate = candidates.getJSONObject(0)
                    val contentObj = candidate.optJSONObject("content")
                    val parts = contentObj?.optJSONArray("parts")
                    if (parts != null && parts.length() > 0) {
                        val replyText = parts.getJSONObject(0).optString("text")
                        return@withContext Result.success(replyText)
                    }
                }
                Result.success("I analyzed your productivity reports, but could not generate a response. Please ask a specific question.")
            } else {
                val errorStream = connection.errorStream
                val errorMsg = if (errorStream != null) {
                    BufferedReader(InputStreamReader(errorStream, "UTF-8")).use { it.readText() }
                } else {
                    "HTTP $responseCode ${connection.responseMessage}"
                }
                Result.failure(RuntimeException("Gemini API Error ($responseCode): $errorMsg"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
