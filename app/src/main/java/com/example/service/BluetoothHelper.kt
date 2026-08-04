package com.example.service

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import androidx.core.content.ContextCompat

data class BluetoothDeviceInfo(
    val isConnected: Boolean,
    val deviceName: String?,
    val deviceType: String
)

object BluetoothHelper {

    fun checkBluetoothHeadphoneStatus(context: Context): BluetoothDeviceInfo {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            ?: return BluetoothDeviceInfo(false, null, "No Audio Service")

        var isConnected = false
        var deviceType = "Disconnected"
        var deviceName: String? = null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            for (device in audioDevices) {
                when (device.type) {
                    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> {
                        isConnected = true
                        deviceType = "Bluetooth Stereo (A2DP)"
                        if (device.productName.isNotEmpty()) {
                            deviceName = device.productName.toString()
                        }
                        break
                    }
                    AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> {
                        isConnected = true
                        deviceType = "Bluetooth Headset (SCO)"
                        if (device.productName.isNotEmpty()) {
                            deviceName = device.productName.toString()
                        }
                        break
                    }
                    AudioDeviceInfo.TYPE_BLE_HEADSET -> {
                        isConnected = true
                        deviceType = "Bluetooth LE Headset"
                        if (device.productName.isNotEmpty()) {
                            deviceName = device.productName.toString()
                        }
                        break
                    }
                }
            }
        }

        // Fallback check for older SDKs or if name wasn't populated from AudioDeviceInfo
        @Suppress("DEPRECATION")
        if (!isConnected) {
            if (audioManager.isBluetoothA2dpOn || audioManager.isBluetoothScoOn) {
                isConnected = true
                deviceType = "Bluetooth Audio Connected"
            }
        }

        // Try to get specific bluetooth device name if permission is available
        if (isConnected && deviceName == null) {
            deviceName = getConnectedBluetoothDeviceName(context)
        }

        return BluetoothDeviceInfo(
            isConnected = isConnected,
            deviceName = deviceName ?: if (isConnected) "Bluetooth Headphones" else null,
            deviceType = deviceType
        )
    }

    @SuppressLint("MissingPermission")
    private fun getConnectedBluetoothDeviceName(context: Context): String? {
        val hasPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH
            ) == PackageManager.PERMISSION_GRANTED
        }

        if (!hasPermission) return null

        return try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()
            adapter?.bondedDevices?.firstOrNull { device ->
                // Basic heuristic for connected audio devices
                device.type == BluetoothDevice.DEVICE_TYPE_DUAL ||
                        device.type == BluetoothDevice.DEVICE_TYPE_CLASSIC
            }?.name
        } catch (e: Exception) {
            null
        }
    }
}
