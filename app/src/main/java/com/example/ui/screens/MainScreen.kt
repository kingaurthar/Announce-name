package com.example.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatterySaver
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.AnnouncementLog
import com.example.service.BluetoothDeviceInfo
import com.example.ui.BluetoothAnnouncerViewModel
import com.example.ui.theme.SleekBlueContainer
import com.example.ui.theme.SleekBluePrimary
import com.example.ui.theme.SleekBorder
import com.example.ui.theme.SleekDivider
import com.example.ui.theme.SleekIconCircle
import com.example.ui.theme.SleekOnBlueContainer
import com.example.ui.theme.SleekPurpleAccent
import com.example.ui.theme.SleekSurfaceVariant
import com.example.ui.theme.SleekTextSecondary
import com.example.ui.theme.StatusGreen
import com.example.ui.theme.StatusGreenContainer
import com.example.ui.theme.StatusRed
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: BluetoothAnnouncerViewModel) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val settings by viewModel.settings.collectAsState()
    val bluetoothInfo by viewModel.bluetoothInfo.collectAsState()
    val permissionMap by viewModel.permissionStatusMap.collectAsState()
    val recentLogs by viewModel.recentLogs.collectAsState()
    val isIgnoringBattery by viewModel.isIgnoringBatteryOptimizations.collectAsState()

    var showBatteryGuidanceDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Launcher for requesting multiple permissions
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        viewModel.checkPermissions()
        viewModel.refreshBluetoothStatus()
    }

    LaunchedEffect(Unit) {
        viewModel.checkPermissions()
        viewModel.refreshBluetoothStatus()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Service Active",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 1.sp
                            )
                        }
                        Text(
                            text = "Voice Announcer",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = { viewModel.refreshBluetoothStatus() },
                        modifier = Modifier.testTag("refresh_bt_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh Bluetooth status"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        bottomBar = {
            NavigationBar(
                modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars),
                containerColor = SleekSurfaceVariant,
                tonalElevation = 4.dp
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.testTag("nav_tab_dashboard"),
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SleekOnBlueContainer,
                        indicatorColor = SleekBlueContainer
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Tune, contentDescription = "Voice & Pitch") },
                    label = { Text("Voice", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.testTag("nav_tab_voice"),
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SleekOnBlueContainer,
                        indicatorColor = SleekBlueContainer
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.testTag("nav_tab_settings"),
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SleekOnBlueContainer,
                        indicatorColor = SleekBlueContainer
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.History, contentDescription = "Call History") },
                    label = { Text("Logs", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.testTag("nav_tab_logs"),
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SleekOnBlueContainer,
                        indicatorColor = SleekBlueContainer
                    )
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (selectedTab) {
                0 -> DashboardTab(
                    viewModel = viewModel,
                    bluetoothInfo = bluetoothInfo,
                    permissionMap = permissionMap,
                    isIgnoringBattery = isIgnoringBattery,
                    recentLogs = recentLogs,
                    onRequestPermissions = {
                        val permsToRequest = mutableListOf(
                            Manifest.permission.READ_PHONE_STATE,
                            Manifest.permission.READ_CONTACTS
                        )
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            permsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
                        } else {
                            permsToRequest.add(Manifest.permission.BLUETOOTH)
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            permsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        permissionLauncher.launch(permsToRequest.toTypedArray())
                    },
                    onOpenBatteryGuidance = { showBatteryGuidanceDialog = true }
                )
                1 -> VoicePitchTab(viewModel = viewModel)
                2 -> SettingsTab(
                    viewModel = viewModel,
                    isIgnoringBattery = isIgnoringBattery,
                    onOpenBatteryGuidance = { showBatteryGuidanceDialog = true }
                )
                3 -> LogsTab(logs = recentLogs, onClearLogs = { viewModel.clearLogs() })
            }
        }

        if (showBatteryGuidanceDialog) {
            BatteryOptimizationGuidanceDialog(
                onDismiss = { showBatteryGuidanceDialog = false },
                onRequestExemption = {
                    viewModel.requestIgnoreBatteryOptimizations(context)
                    showBatteryGuidanceDialog = false
                }
            )
        }
    }
}

@Composable
fun DashboardTab(
    viewModel: BluetoothAnnouncerViewModel,
    bluetoothInfo: BluetoothDeviceInfo,
    permissionMap: Map<String, Boolean>,
    isIgnoringBattery: Boolean,
    recentLogs: List<AnnouncementLog>,
    onRequestPermissions: () -> Unit,
    onOpenBatteryGuidance: () -> Unit
) {
    val settings by viewModel.settings.collectAsState()
    var simNameInput by remember { mutableStateOf("Sarah Jenkins") }
    var simNumberInput by remember { mutableStateOf("+1 555-0192") }

    val missingPermissions = permissionMap.values.contains(false) || permissionMap.isEmpty()
    val lastLog = recentLogs.firstOrNull()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Bluetooth Status Hero Card matching Sleek Interface specification
        item {
            SleekBluetoothStatusHeroCard(
                bluetoothInfo = bluetoothInfo,
                onRefresh = { viewModel.refreshBluetoothStatus() }
            )
        }

        // Service Switch & Options Container
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                    // Announce Caller Name toggle
                    SleekOptionRow(
                        icon = Icons.Default.RecordVoiceOver,
                        title = "Announce Caller Name",
                        subtitle = if (settings.isServiceEnabled) "Reading aloud from contacts list" else "Service is turned off",
                        trailing = {
                            Switch(
                                checked = settings.isServiceEnabled,
                                onCheckedChange = { viewModel.toggleServiceEnabled(it) },
                                modifier = Modifier.testTag("master_service_switch"),
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = SleekPurpleAccent
                                )
                            )
                        }
                    )

                    Divider(color = SleekDivider, modifier = Modifier.padding(horizontal = 16.dp))

                    // Bluetooth Only toggle
                    SleekOptionRow(
                        icon = Icons.Default.Headphones,
                        title = "Announce Only on Bluetooth",
                        subtitle = "Prevents speaker playback when un-docked",
                        trailing = {
                            Switch(
                                checked = settings.onlyWhenBluetoothConnected,
                                onCheckedChange = { viewModel.updateOnlyWhenBluetoothConnected(it) },
                                modifier = Modifier.testTag("setting_only_bt_switch"),
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = SleekPurpleAccent
                                )
                            )
                        }
                    )

                    Divider(color = SleekDivider, modifier = Modifier.padding(horizontal = 16.dp))

                    // Unknown Callers toggle
                    SleekOptionRow(
                        icon = Icons.Default.Call,
                        title = "Announce Unknown Callers",
                        subtitle = if (settings.speakUnknownNumbers) "Announcing all incoming calls" else "Announcing saved contacts only",
                        trailing = {
                            Switch(
                                checked = settings.speakUnknownNumbers,
                                onCheckedChange = { viewModel.updateSpeakUnknownNumbers(it) },
                                modifier = Modifier.testTag("dashboard_unknown_numbers_switch"),
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = SleekPurpleAccent
                                )
                            )
                        }
                    )

                    Divider(color = SleekDivider, modifier = Modifier.padding(horizontal = 16.dp))

                    // Voice Settings Shortcut
                    SleekOptionRow(
                        icon = Icons.Default.VolumeUp,
                        title = "Voice Rate & Pitch",
                        subtitle = String.format(Locale.US, "Speed: %.1fx • Pitch: %.1fx", settings.speechRate, settings.speechPitch),
                        trailing = {
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    )
                }
            }
        }

        // Battery Optimization Alert Banner if not ignored
        if (!isIgnoringBattery) {
            item {
                BatteryOptimizationWarningCard(onOpenGuidance = onOpenBatteryGuidance)
            }
        }

        // Permissions Banner (If any missing)
        if (missingPermissions) {
            item {
                PermissionsStatusCard(
                    permissionMap = permissionMap,
                    hasMissing = true,
                    onRequestPermissions = onRequestPermissions
                )
            }
        }

        // Test Call Simulator Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(SleekBlueContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Call,
                                contentDescription = null,
                                tint = SleekBluePrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Simulate Incoming Call",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Trigger caller speech to test headset announcement",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = simNameInput,
                        onValueChange = { simNameInput = it },
                        label = { Text("Caller Name") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("sim_name_input"),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = simNumberInput,
                        onValueChange = { simNumberInput = it },
                        label = { Text("Phone Number") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("sim_number_input"),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = { viewModel.simulateCall(number = simNumberInput, name = simNameInput) },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("simulate_call_button"),
                            colors = ButtonDefaults.buttonColors(containerColor = SleekBluePrimary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Simulate Call")
                        }

                        OutlinedButton(
                            onClick = {
                                viewModel.testTTSAnnouncement("${settings.announcePrefix} $simNameInput")
                            },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("test_speech_button"),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.VolumeUp, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Test Voice")
                        }
                    }
                }
            }
        }

        // Last Announcement Status Banner (Footer section matching HTML design)
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = SleekSurfaceVariant)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(SleekIconCircle),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = "LAST ANNOUNCEMENT",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = if (lastLog != null) "\"${lastLog.announcedMessage}\"" else "\"Monitoring ready for incoming calls\"",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SleekBluetoothStatusHeroCard(
    bluetoothInfo: BluetoothDeviceInfo,
    onRefresh: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = SleekBlueContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBAC8DB))
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = "Bluetooth Status",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        color = SleekOnBlueContainer
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = bluetoothInfo.deviceName ?: "No Headset Connected",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = SleekOnBlueContainer
                    )
                }

                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(SleekBluePrimary)
                        .clickable { onRefresh() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (bluetoothInfo.isConnected) Icons.Default.BluetoothConnected else Icons.Default.Bluetooth,
                        contentDescription = "Bluetooth Status",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (bluetoothInfo.isConnected) StatusGreen else Color(0xFFEAB308))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (bluetoothInfo.isConnected) "Monitoring for incoming calls" else "Waiting for Bluetooth headphone connection",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF43474E),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun SleekOptionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    trailing: @Composable () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        trailing()
    }
}

@Composable
fun BatteryOptimizationWarningCard(onOpenGuidance: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFD97706)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.BatterySaver,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Background Execution Notice",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF92400E)
                )
                Text(
                    text = "Exempt from battery optimization so call listener runs while phone sleeps",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF78350F)
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Button(
                onClick = onOpenGuidance,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Fix", fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

@Composable
fun BatteryOptimizationGuidanceDialog(
    onDismiss: () -> Unit,
    onRequestExemption: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Default.BatterySaver,
                contentDescription = null,
                tint = SleekBluePrimary,
                modifier = Modifier.size(36.dp)
            )
        },
        title = {
            Text(
                text = "Keep Call Listener Active",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Android battery optimization may kill background services when your phone enters deep sleep, missing incoming call announcements.",
                    style = MaterialTheme.typography.bodyMedium
                )

                Text(
                    text = "Recommended Steps:",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    StepItem(step = "1", text = "Tap 'Allow Unrestricted' below")
                    StepItem(step = "2", text = "Select 'No Restrictions' or 'Unrestricted' in battery settings")
                    StepItem(step = "3", text = "Enjoy instant caller announcements on headset anytime")
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onRequestExemption,
                colors = ButtonDefaults.buttonColors(containerColor = SleekBluePrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Allow Unrestricted")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Dismiss")
            }
        }
    )
}

@Composable
fun StepItem(step: String, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .background(SleekBlueContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = step,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = SleekOnBlueContainer
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun VoicePitchTab(viewModel: BluetoothAnnouncerViewModel) {
    val settings by viewModel.settings.collectAsState()
    var sampleTestText by remember { mutableStateOf("Incoming call from Sarah Jenkins") }

    var isPlayingSample by remember { mutableStateOf(false) }

    // Waveform animation effect
    val infiniteTransition = rememberInfiniteTransition(label = "wave")
    val waveHeight by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "wave_height"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = SleekBlueContainer),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBAC8DB))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(SleekBluePrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Tune,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(26.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "Voice Tuning",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = SleekOnBlueContainer
                            )
                            Text(
                                text = "Adjust speech speed & pitch for caller readout",
                                style = MaterialTheme.typography.bodySmall,
                                color = SleekTextSecondary
                            )
                        }
                    }
                }
            }
        }

        // Speech Rate Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Speed,
                                contentDescription = null,
                                tint = SleekBluePrimary,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Speech Speed Rate",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        val rateLabel = when {
                            settings.speechRate < 0.8f -> "Slow & Clear"
                            settings.speechRate in 0.8f..1.1f -> "Normal Speed"
                            settings.speechRate in 1.15f..1.5f -> "Fast Readout"
                            else -> "Very Fast"
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(SleekBlueContainer)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = String.format(Locale.US, "%.1fx • %s", settings.speechRate, rateLabel),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = SleekOnBlueContainer
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Slider(
                        value = settings.speechRate,
                        onValueChange = { viewModel.updateSpeechRate(it) },
                        valueRange = 0.5f..2.0f,
                        steps = 15,
                        modifier = Modifier.testTag("speech_rate_slider"),
                        colors = SliderDefaults.colors(
                            thumbColor = SleekBluePrimary,
                            activeTrackColor = SleekBluePrimary
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("0.5x (Slow)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("1.0x (Default)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("2.0x (Fast)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Voice Pitch Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.RecordVoiceOver,
                                contentDescription = null,
                                tint = SleekPurpleAccent,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Voice Pitch",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        val pitchLabel = when {
                            settings.speechPitch < 0.85f -> "Deep Tone"
                            settings.speechPitch in 0.85f..1.15f -> "Natural Tone"
                            else -> "High Pitch"
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFEADDFF))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = String.format(Locale.US, "%.1fx • %s", settings.speechPitch, pitchLabel),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF21005D)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Slider(
                        value = settings.speechPitch,
                        onValueChange = { viewModel.updateSpeechPitch(it) },
                        valueRange = 0.5f..1.8f,
                        steps = 13,
                        modifier = Modifier.testTag("speech_pitch_slider"),
                        colors = SliderDefaults.colors(
                            thumbColor = SleekPurpleAccent,
                            activeTrackColor = SleekPurpleAccent
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("0.5x (Deep)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("1.0x (Natural)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("1.8x (High)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Quick Presets
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Voice Presets",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        VoicePresetChip(
                            name = "Standard",
                            rate = 1.0f,
                            pitch = 1.0f,
                            currentRate = settings.speechRate,
                            currentPitch = settings.speechPitch,
                            onSelect = { r, p ->
                                viewModel.updateSpeechRate(r)
                                viewModel.updateSpeechPitch(p)
                            },
                            modifier = Modifier.weight(1f)
                        )

                        VoicePresetChip(
                            name = "Fast Alert",
                            rate = 1.3f,
                            pitch = 1.1f,
                            currentRate = settings.speechRate,
                            currentPitch = settings.speechPitch,
                            onSelect = { r, p ->
                                viewModel.updateSpeechRate(r)
                                viewModel.updateSpeechPitch(p)
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        VoicePresetChip(
                            name = "Deep Voice",
                            rate = 0.9f,
                            pitch = 0.8f,
                            currentRate = settings.speechRate,
                            currentPitch = settings.speechPitch,
                            onSelect = { r, p ->
                                viewModel.updateSpeechRate(r)
                                viewModel.updateSpeechPitch(p)
                            },
                            modifier = Modifier.weight(1f)
                        )

                        VoicePresetChip(
                            name = "High Pitch",
                            rate = 1.1f,
                            pitch = 1.4f,
                            currentRate = settings.speechRate,
                            currentPitch = settings.speechPitch,
                            onSelect = { r, p ->
                                viewModel.updateSpeechRate(r)
                                viewModel.updateSpeechPitch(p)
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // Test Voice Announcement Preview Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Sample Speech Test",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Listen to how the voice announcement will sound in your connected headphones",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = sampleTestText,
                        onValueChange = { sampleTestText = it },
                        label = { Text("Speech Phrase") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            isPlayingSample = true
                            viewModel.testTTSAnnouncement(sampleTestText)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("voice_test_preview_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = SleekBluePrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.VolumeUp, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Play Speech Preview", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }

                    if (isPlayingSample) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            repeat(5) { i ->
                                val barScale = if (i % 2 == 0) waveHeight else (1.4f - waveHeight)
                                Box(
                                    modifier = Modifier
                                        .padding(horizontal = 3.dp)
                                        .width(4.dp)
                                        .height((24 * barScale).dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(SleekBluePrimary)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VoicePresetChip(
    name: String,
    rate: Float,
    pitch: Float,
    currentRate: Float,
    currentPitch: Float,
    onSelect: (Float, Float) -> Unit,
    modifier: Modifier = Modifier
) {
    val isSelected = Math.abs(currentRate - rate) < 0.05f && Math.abs(currentPitch - pitch) < 0.05f
    val bg = if (isSelected) SleekBluePrimary else SleekSurfaceVariant
    val textColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .clickable { onSelect(rate, pitch) }
            .padding(vertical = 12.dp, horizontal = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            Text(
                text = String.format(Locale.US, "%.1fx speed • %.1fx pitch", rate, pitch),
                style = MaterialTheme.typography.labelSmall,
                color = textColor.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
fun PermissionsStatusCard(
    permissionMap: Map<String, Boolean>,
    hasMissing: Boolean,
    onRequestPermissions: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (hasMissing) Color(0xFFFEF2F2) else SleekSurfaceVariant
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (hasMissing) Color(0xFFFCA5A5) else SleekBorder.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (hasMissing) Icons.Default.Warning else Icons.Default.Security,
                        contentDescription = null,
                        tint = if (hasMissing) StatusRed else StatusGreen,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = if (hasMissing) "Permissions Required" else "Permissions Ready",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (hasMissing) {
                    Button(
                        onClick = onRequestPermissions,
                        modifier = Modifier.testTag("grant_permissions_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = StatusRed),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Grant")
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                PermissionRowItem(
                    title = "Read Phone State (Incoming Calls)",
                    isGranted = permissionMap[Manifest.permission.READ_PHONE_STATE] == true
                )
                PermissionRowItem(
                    title = "Read Contacts (Caller ID Lookup)",
                    isGranted = permissionMap[Manifest.permission.READ_CONTACTS] == true
                )
                val btPerm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Manifest.permission.BLUETOOTH_CONNECT else Manifest.permission.BLUETOOTH
                PermissionRowItem(
                    title = "Bluetooth Headset Connect Detection",
                    isGranted = permissionMap[btPerm] == true
                )
            }
        }
    }
}

@Composable
fun PermissionRowItem(title: String, isGranted: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = if (isGranted) Icons.Default.CheckCircle else Icons.Default.Warning,
            contentDescription = null,
            tint = if (isGranted) StatusGreen else StatusRed,
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = title,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun SettingsTab(
    viewModel: BluetoothAnnouncerViewModel,
    isIgnoringBattery: Boolean,
    onOpenBatteryGuidance: () -> Unit
) {
    val settings by viewModel.settings.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Preferences",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        }

        // Announcement Prefix Setting
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Announcement Phrase",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Prefix phrase spoken before caller's name (e.g., 'Incoming call from')",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = settings.announcePrefix,
                        onValueChange = { viewModel.updatePrefix(it) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("setting_prefix_input"),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }
        }

        // Repeat Count Setting
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Announcement Repeat Count",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "How many times to repeat the name while phone is ringing",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        listOf(1, 2, 3, 5).forEach { count ->
                            val isSelected = settings.repeatCount == count
                            val containerColor = if (isSelected) SleekBluePrimary else SleekSurfaceVariant
                            val textColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(containerColor)
                                    .clickable { viewModel.updateRepeatCount(count) }
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$count Times",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = textColor
                                )
                            }
                        }
                    }
                }
            }
        }

        // Unknown Numbers Option
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Announce Unknown Callers",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (settings.speakUnknownNumbers)
                                "Announcing all incoming calls (saved contacts and unknown phone numbers)"
                            else
                                "Only announcing saved contacts (unknown numbers not in contact list are silenced)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = settings.speakUnknownNumbers,
                        onCheckedChange = { viewModel.updateSpeakUnknownNumbers(it) },
                        modifier = Modifier.testTag("setting_unknown_numbers_switch"),
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = SleekPurpleAccent
                        )
                    )
                }
            }
        }

        // Battery Optimization Setting Row
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.6f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenBatteryGuidance() }
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(if (isIgnoringBattery) StatusGreenContainer else Color(0xFFFEF3C7)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.BatterySaver,
                                contentDescription = null,
                                tint = if (isIgnoringBattery) StatusGreen else Color(0xFFD97706),
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = "Battery Optimization",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = if (isIgnoringBattery) "App is exempt (Optimal background work)" else "Optimized (Click for guidance)",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isIgnoringBattery) StatusGreen else Color(0xFFD97706)
                            )
                        }
                    }

                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun LogsTab(
    logs: List<AnnouncementLog>,
    onClearLogs: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, hh:mm a", Locale.getDefault()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Call History",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${logs.size} announcements recorded",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (logs.isNotEmpty()) {
                IconButton(onClick = onClearLogs, modifier = Modifier.testTag("clear_logs_button")) {
                    Icon(Icons.Default.Delete, contentDescription = "Clear History")
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (logs.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No Call Announcements Yet",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Calls announced while connected to Bluetooth will appear here",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(logs, key = { it.id }) { log ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SleekBorder.copy(alpha = 0.5f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (log.wasAnnounced) StatusGreenContainer
                                        else MaterialTheme.colorScheme.errorContainer
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (log.wasAnnounced) Icons.Default.Headphones else Icons.Default.Warning,
                                    contentDescription = null,
                                    tint = if (log.wasAnnounced) StatusGreen else StatusRed,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = log.callerName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = log.phoneNumber,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = log.announcedMessage,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = SleekBluePrimary,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = dateFormat.format(Date(log.timestamp)),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                log.bluetoothDeviceName?.let { device ->
                                    Text(
                                        text = device,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.secondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
