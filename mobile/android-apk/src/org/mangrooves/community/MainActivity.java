package org.mangrooves.community;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Parcelable;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int REQUEST_LOCATION = 1001;
    private static final int REQUEST_CAMERA = 1002;
    private static final int REQUEST_FILE = 1003;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileCallback;
    private WebChromeClient.FileChooserParams pendingFileChooser;
    private Uri pendingCameraUri;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(23, 61, 32));
        getWindow().setNavigationBarColor(Color.rgb(23, 61, 32));

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);

        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        FrameLayout.LayoutParams progressLayout = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            8
        );
        root.addView(progressBar, progressLayout);
        setContentView(root);

        configureWebView();
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(getString(R.string.app_url));
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " ManGROOVESAndroid/1.0");

        CookieManager.getInstance().setAcceptCookie(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri destination = request.getUrl();
                Uri application = Uri.parse(getString(R.string.app_url));
                if (destination.getHost() != null
                    && destination.getHost().equalsIgnoreCase(application.getHost())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, destination));
                } catch (ActivityNotFoundException exception) {
                    Toast.makeText(MainActivity.this, "No application can open this link.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, R.string.server_unavailable, Toast.LENGTH_LONG).show();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                progressBar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(
                String origin,
                GeolocationPermissions.Callback callback
            ) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                    return;
                }
                locationOrigin = origin;
                locationCallback = callback;
                requestPermissions(new String[] {
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                }, REQUEST_LOCATION);
            }

            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams chooserParams
            ) {
                cancelPendingFileRequest();
                fileCallback = callback;
                pendingFileChooser = chooserParams;
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[] { Manifest.permission.CAMERA }, REQUEST_CAMERA);
                } else {
                    launchFileChooser();
                }
                return true;
            }
        });
    }

    private void launchFileChooser() {
        if (fileCallback == null) {
            return;
        }

        Intent contentIntent;
        try {
            contentIntent = pendingFileChooser == null
                ? new Intent(Intent.ACTION_GET_CONTENT)
                : pendingFileChooser.createIntent();
        } catch (ActivityNotFoundException exception) {
            contentIntent = new Intent(Intent.ACTION_GET_CONTENT);
        }
        contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
        contentIntent.setType("image/*");

        Parcelable[] initialIntents = new Parcelable[0];
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        boolean cameraAllowed = checkSelfPermission(Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
        if (cameraAllowed && cameraIntent.resolveActivity(getPackageManager()) != null) {
            ContentValues values = new ContentValues();
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "mangrooves_" + timestamp + ".jpg");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            pendingCameraUri = getContentResolver().insert(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                values
            );
            if (pendingCameraUri != null) {
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
                cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                initialIntents = new Parcelable[] { cameraIntent };
            }
        }

        Intent chooser = Intent.createChooser(contentIntent, getString(R.string.choose_photo));
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, initialIntents);
        try {
            startActivityForResult(chooser, REQUEST_FILE);
        } catch (ActivityNotFoundException exception) {
            cancelPendingFileRequest();
            Toast.makeText(this, "No camera or photo picker is available.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_FILE || fileCallback == null) {
            return;
        }

        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data == null || data.getData() == null) {
                if (pendingCameraUri != null) {
                    result = new Uri[] { pendingCameraUri };
                    pendingCameraUri = null;
                }
            } else {
                deleteUnusedCameraImage();
                result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            }
        } else {
            deleteUnusedCameraImage();
        }

        fileCallback.onReceiveValue(result);
        fileCallback = null;
        pendingFileChooser = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION && locationCallback != null) {
            boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            locationCallback.invoke(locationOrigin, granted, false);
            locationCallback = null;
            locationOrigin = null;
            return;
        }
        if (requestCode == REQUEST_CAMERA) {
            launchFileChooser();
        }
    }

    private void deleteUnusedCameraImage() {
        if (pendingCameraUri != null) {
            getContentResolver().delete(pendingCameraUri, null, null);
            pendingCameraUri = null;
        }
    }

    private void cancelPendingFileRequest() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        pendingFileChooser = null;
        deleteUnusedCameraImage();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        cancelPendingFileRequest();
        super.onDestroy();
    }
}
