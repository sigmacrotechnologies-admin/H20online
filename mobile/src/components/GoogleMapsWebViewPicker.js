import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { getGoogleMapsApiKey } from "@/src/utils/mapRuntime";
import { pickerStyles as styles } from "./addressMapPickerUtils";

function buildMapHtml(lat, lng, apiKey) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>html,body,#map{width:100%;height:100%;margin:0;padding:0}</style>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    let map, marker;
    function init() {
      const center = { lat: ${lat}, lng: ${lng} };
      map = new google.maps.Map(document.getElementById("map"), {
        center,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      marker = new google.maps.Marker({ position: center, map, draggable: true });
      function send(lat, lng) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
        }
      }
      marker.addListener("dragend", () => {
        const p = marker.getPosition();
        send(p.lat(), p.lng());
      });
      map.addListener("click", (e) => {
        marker.setPosition(e.latLng);
        send(e.latLng.lat(), e.latLng.lng());
      });
      window.updateMarker = function(lat, lng) {
        const pos = { lat, lng };
        marker.setPosition(pos);
        map.panTo(pos);
      };
    }
    if (document.readyState === "complete") init();
    else window.addEventListener("load", init);
  </script>
</body>
</html>`;
}

export default function GoogleMapsWebViewPicker({ lat, lng, onPick }) {
  const webRef = useRef(null);
  const apiKey = getGoogleMapsApiKey();
  const html = useMemo(() => buildMapHtml(lat, lng, apiKey), [apiKey]);

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `if (window.updateMarker) { window.updateMarker(${lat}, ${lng}); } true;`
    );
  }, [lat, lng]);

  return (
    <View style={styles.map}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1 }}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
              onPick?.(data.lat, data.lng);
            }
          } catch {
            // ignore
          }
        }}
        scrollEnabled={false}
        nestedScrollEnabled
      />
    </View>
  );
}
