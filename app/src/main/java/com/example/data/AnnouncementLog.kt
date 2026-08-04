package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "announcement_logs")
data class AnnouncementLog(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val phoneNumber: String,
    val callerName: String,
    val timestamp: Long = System.currentTimeMillis(),
    val announcedMessage: String,
    val bluetoothDeviceName: String?,
    val wasAnnounced: Boolean
)
