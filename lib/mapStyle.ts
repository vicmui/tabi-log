// lib/mapStyle.ts

/**
 * 全站共用的地圖配色。
 *
 * 這一組原本寫死在「全程地圖」頁內，其他地圖各自用 Google 預設色，
 * 於是同一個 app 裡有兩種截然不同的地圖。抽出來之後只此一份，改一次全部跟著改。
 *
 * 灰階為主：整個介面是黑白的，地圖若滿佈橙色餐廳圖示與藍色水域，
 * 反而是畫面上最嘈的一塊。關掉 labels.icon 亦順帶解決近距離縮放時圖示打架的問題。
 */
export const MONO_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',           stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon',        stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'poi',          elementType: 'geometry',         stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi',          elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park',     elementType: 'geometry',         stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'road',         elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry',         stylers: [{ color: '#dadada' }] },
  { featureType: 'water',        elementType: 'geometry',         stylers: [{ color: '#c9c9c9' }] },
]

/** 品牌色：地圖上的標記一律用這個黑，與介面一致 */
export const MARK_BLACK = '#1a1a1a'
