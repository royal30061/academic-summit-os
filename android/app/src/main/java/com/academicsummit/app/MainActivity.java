package com.academicsummit.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BleProximityPlugin.class);   // Bluetooth proximity attendance (custom plugin, no npm package)
        super.onCreate(savedInstanceState);
    }
}
