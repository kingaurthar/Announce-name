package com.example.service

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import androidx.core.content.ContextCompat

object ContactHelper {

    fun getContactName(context: Context, phoneNumber: String?): String? {
        if (phoneNumber.isNull_or_empty()) {
            return null
        }

        val trimmedInput = phoneNumber!!.trim()

        // If string already contains letters (e.g. "Sarah Jenkins" or "Mom"), return as contact name directly
        if (trimmedInput.any { it.isLetter() }) {
            return trimmedInput
        }

        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            return null
        }

        return try {
            val uri = Uri.withAppendedPath(
                ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                Uri.encode(trimmedInput)
            )
            val projection = arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME)

            context.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(ContactsContract.PhoneLookup.DISPLAY_NAME)
                    if (nameIndex != -1) {
                        val foundName = cursor.getString(nameIndex)
                        if (!foundName.isNullOrBlank()) {
                            return@use foundName.trim()
                        }
                    }
                }
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()

    fun formatPhoneNumberForSpeech(phoneNumber: String): String {
        // Clean digits and space out numbers so TTS speaks digits naturally (e.g. "9 8 7 6 5 4 3 2 1 0")
        val cleanDigits = phoneNumber.filter { it.isDigit() }
        if (cleanDigits.isEmpty()) return "Unknown number"
        return cleanDigits.chunked(1).joinToString(" ")
    }
}
