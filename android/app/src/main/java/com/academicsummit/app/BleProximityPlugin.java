package com.academicsummit.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Academic Summit - Bluetooth proximity attendance (one plugin, both roles).
 *
 * Lecturer phone:  startAdvertising({service, data})  broadcasts a short token as BLE service data (no pairing, no connection).
 * Student phone:   scan({service, durationMs})         listens and returns [{token, rssi}] for tokens heard (strongest signal each).
 * The token is decoded here as plain ASCII, so the web code never has to guess an encoding.
 * Android 12+ asks for "Nearby devices"; Android 11 and older asks for Location (Android's own rule for Bluetooth scanning).
 * NOT TESTED ON HARDWARE.
 */
@CapacitorPlugin(
    name = "BleProximity",
    permissions = {
        @Permission(alias = "bleNew", strings = {
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.BLUETOOTH_CONNECT
        }),
        @Permission(alias = "bleLegacy", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class BleProximityPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());
    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advCallback;
    private BluetoothLeScanner scanner;
    private ScanCallback scanCallback;
    private Runnable scanFinish;

    // ---------- helpers ----------
    private String[] neededAliases() {
        return Build.VERSION.SDK_INT >= 31 ? new String[] { "bleNew" } : new String[] { "bleLegacy" };
    }

    private boolean permitted() {
        for (String alias : neededAliases()) {
            if (getPermissionState(alias) != PermissionState.GRANTED) return false;
        }
        return true;
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return bm == null ? null : bm.getAdapter();
    }

    private static String advMessage(int code) {
        switch (code) {
            case AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE: return "Bluetooth message too large";
            case AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS: return "Too many Bluetooth broadcasts are running on this phone";
            case AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED: return "Bluetooth broadcast already running";
            case AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED: return "This phone cannot broadcast over Bluetooth";
            default: return "Bluetooth broadcast failed (code " + code + ")";
        }
    }

    // ---------- status ----------
    @PluginMethod
    public void isSupported(PluginCall call) {
        BluetoothAdapter ad = adapter();
        JSObject out = new JSObject();
        out.put("supported", ad != null);
        out.put("enabled", ad != null && ad.isEnabled());
        out.put("canAdvertise", ad != null && ad.isMultipleAdvertisementSupported());
        call.resolve(out);
    }

    // ---------- lecturer ----------
    @PluginMethod
    public void startAdvertising(PluginCall call) {
        if (!permitted()) {
            requestPermissionForAliases(neededAliases(), call, "permissionsDone");
            return;
        }
        doStartAdvertising(call);
    }

    private void doStartAdvertising(final PluginCall call) {
        try {
            String service = call.getString("service");
            String data = call.getString("data");
            if (service == null || data == null || data.length() < 4 || data.length() > 8) {
                call.reject("Bad Bluetooth settings");
                return;
            }
            BluetoothAdapter ad = adapter();
            if (ad == null) { call.reject("This phone has no Bluetooth"); return; }
            if (!ad.isEnabled()) { call.reject("Turn Bluetooth on and try again"); return; }
            BluetoothLeAdvertiser adv = ad.getBluetoothLeAdvertiser();
            if (adv == null) { call.reject("This phone cannot broadcast over Bluetooth"); return; }

            stopAdvertisingInternal();

            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0)
                .build();
            AdvertiseData payload = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceData(new ParcelUuid(UUID.fromString(service)), data.getBytes(StandardCharsets.US_ASCII))
                .build();

            final AtomicBoolean answered = new AtomicBoolean(false);
            advCallback = new AdvertiseCallback() {
                @Override public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    if (answered.compareAndSet(false, true)) call.resolve();
                }
                @Override public void onStartFailure(int errorCode) {
                    if (answered.compareAndSet(false, true)) call.reject(advMessage(errorCode));
                }
            };
            advertiser = adv;
            adv.startAdvertising(settings, payload, advCallback);
        } catch (SecurityException e) {
            call.reject("Bluetooth permission missing");
        } catch (Exception e) {
            call.reject("Bluetooth broadcast failed: " + e.getMessage());
        }
    }

    private void stopAdvertisingInternal() {
        try {
            if (advertiser != null && advCallback != null) advertiser.stopAdvertising(advCallback);
        } catch (Exception ignored) { }
        advCallback = null;
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        stopAdvertisingInternal();
        call.resolve();
    }

    // ---------- student ----------
    @PluginMethod
    public void scan(PluginCall call) {
        if (!permitted()) {
            requestPermissionForAliases(neededAliases(), call, "permissionsDone");
            return;
        }
        doScan(call);
    }

    private void doScan(final PluginCall call) {
        try {
            String service = call.getString("service");
            if (service == null) { call.reject("Bad Bluetooth settings"); return; }
            int total = call.getInt("durationMs", 8000);
            final long totalMs = Math.max(3000, Math.min(total, 20000));
            BluetoothAdapter ad = adapter();
            if (ad == null) { call.reject("This phone has no Bluetooth"); return; }
            if (!ad.isEnabled()) { call.reject("Turn Bluetooth on and try again"); return; }
            BluetoothLeScanner sc = ad.getBluetoothLeScanner();
            if (sc == null) { call.reject("Bluetooth scanner not available"); return; }

            stopScanInternal();
            final ParcelUuid uuid = new ParcelUuid(UUID.fromString(service));
            final Map<String, Integer> best = new ConcurrentHashMap<>();
            final AtomicBoolean finished = new AtomicBoolean(false);
            final AtomicBoolean firstSeen = new AtomicBoolean(false);

            final Runnable finish = new Runnable() {
                @Override public void run() {
                    if (!finished.compareAndSet(false, true)) return;
                    stopScanInternal();
                    JSArray list = new JSArray();
                    for (Map.Entry<String, Integer> e : best.entrySet()) {
                        JSObject o = new JSObject();
                        o.put("token", e.getKey());
                        o.put("rssi", e.getValue());
                        list.put(o);
                    }
                    JSObject out = new JSObject();
                    out.put("results", list);
                    call.resolve(out);
                }
            };

            scanCallback = new ScanCallback() {
                @Override public void onScanResult(int callbackType, ScanResult result) {
                    ScanRecord rec = result.getScanRecord();
                    if (rec == null) return;
                    byte[] raw = rec.getServiceData(uuid);
                    if (raw == null || raw.length < 4) return;
                    String token = new String(raw, StandardCharsets.US_ASCII).replaceAll("[^A-Z0-9]", "");
                    if (token.length() < 4) return;
                    if (token.length() > 8) token = token.substring(0, 8);
                    int rssi = result.getRssi();
                    Integer old = best.get(token);
                    if (old == null || rssi > old) best.put(token, rssi);
                    // finish early: a couple of seconds after the first beacon is heard (speed), instead of the full window
                    if (firstSeen.compareAndSet(false, true)) main.postDelayed(finish, 2500);
                }
                @Override public void onScanFailed(int errorCode) {
                    if (finished.compareAndSet(false, true)) {
                        stopScanInternal();
                        call.reject("Bluetooth scan failed (code " + errorCode + ")");
                    }
                }
            };
            scanFinish = finish;
            scanner = sc;
            sc.startScan(new ArrayList<ScanFilter>(), new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback);
            main.postDelayed(finish, totalMs);
        } catch (SecurityException e) {
            call.reject("Bluetooth permission missing");
        } catch (Exception e) {
            call.reject("Bluetooth scan failed: " + e.getMessage());
        }
    }

    private void stopScanInternal() {
        try {
            if (scanner != null && scanCallback != null) scanner.stopScan(scanCallback);
        } catch (Exception ignored) { }
        if (scanFinish != null) main.removeCallbacks(scanFinish);
        scanCallback = null;
        scanFinish = null;
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        stopScanInternal();
        call.resolve();
    }

    // ---------- permission answer ----------
    @PermissionCallback
    private void permissionsDone(PluginCall call) {
        if (!permitted()) {
            call.reject("Bluetooth permission was not allowed. Allow \"Nearby devices\" for this app in Settings.");
            return;
        }
        String m = call.getMethodName();
        if ("startAdvertising".equals(m)) doStartAdvertising(call);
        else if ("scan".equals(m)) doScan(call);
        else call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopAdvertisingInternal();
        stopScanInternal();
        super.handleOnDestroy();
    }
}
