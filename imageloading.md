# Image Loading Optimisations Guide

This document summarises **all** performance optimisations implemented in the RollodexApp to achieve near-instant image loading while scrolling and switching categories.
Use it as a blueprint when adding new image-heavy screens.

---

## 1. CDN-Side Image Optimisation

| Technique | Details |
|-----------|---------|
| Utility   | `getOptimizedImageUrl(originalUrl, maxWidth, quality)` |
| Purpose   | Requests downsized WebP thumbnails from Supabase Storage CDN.<br>Reduces payload ~80-90 % vs. full-resolution JPEGs. |
| How       | Adds resizing (`width`) + `format=webp` & `quality` query params to the storage URL. |

### Steps to use
1. Import helper in your component:
   ```js
   import { getOptimizedImageUrl } from 'src/utils/imageHelper';
   ```
2. Wrap every remote image URL:
   ```js
   const thumbUrl = useMemo(() => getOptimizedImageUrl(item.image, 400, 70), [item.image]);
   ```

---

## 2. On-Device Disk Caching with **expo-image**

| Package  | Version | Expo SDK |
|----------|---------|----------|
| `expo-image` | ^1.5.x | 53 |

### Install
```bash
expo install expo-image
```

### Usage Pattern (replacing `<Image>`)
```jsx
import { Image } from 'expo-image';

<Image
  source={{ uri: thumbUrl }}
  style={styles.cardImage}
  contentFit="cover"           // same as resizeMode="cover"
  cachePolicy="immutable"      // saves to disk; URL becomes cache-key
/>
```
`expo-image` loads immediately if the file is already cached; no first-frame flash.

---

## 3. Grey Placeholder Instead of Spinners

• All cards render a light-grey `View` (`CardStyles.loaderContainer`) **under** the image.
• No `ActivityIndicator`, so the UI never blocks the JS thread.

```jsx
{!imageLoaded && <View style={CardStyles.loaderContainer} />}
```

---

## 4. Early Prefetch (First 12 Thumbnails)

Inside **ProviderDiscoveryScreen**:
```js
useEffect(() => {
  const urls = items.slice(0, 12).map(i => getOptimizedImageUrl(i.image, 400, 70));
  urls.forEach(url => Image.prefetch(url));
}, [items]);
```
Prefetch warms the disk cache during idle frames, so images appear instantly on scroll.

---

## 5. Per-Category Data Cache

A `cacheRef.current[category]` array prevents re-fetching items when the user toggles categories; only **silent** background refresh runs.
Images therefore stay in cache and are re-used.

```js
if (cacheRef.current[selectedCategory]) {
  setItems(cacheRef.current[selectedCategory]); // instant UI
}
```

---

## 6. FlatList Rendering Tweaks

| Prop | Value | Reason |
|------|-------|--------|
| `initialNumToRender` | 6–10 | Small first batch = faster TTI |
| `windowSize`         | 5–7 | Limits off-screen renders |
| `maxToRenderPerBatch`| 10–15 | Balances scroll perf |
| `removeClippedSubviews` | `true` | Keeps memory low |
| `listKey` / `key`      | Stable per view | Avoids React "numColumns" invariant |

---

## 7. React.memo + Stable Keys

`ServiceCard`, `HousingCard`, and `GroupCard` are wrapped in `React.memo` to skip re-renders when props are unchanged.
Combined with stable `keyExtractor`, this prevents images from re-mounting and resetting cache state during list updates.

---

## 8. Robust Fallbacks & Error Handling

* `getValidImageUrl` sanitises malformed paths & returns a default image when necessary.
* Each `<Image>`/`expo-image` instance has an `onError` handler logging the problem and swapping in a local placeholder.

---

## 9. Optional Improvements

1. **Progressive decoding** – enable `transition={100}` on `expo-image` for a fade-in effect.
2. **Versioned URLs** – append a `?v=<hash>` param when you update a file to bust older cache entries.
3. **Lazy Prefetch on Scroll** – integrate `onViewableItemsChanged` in FlatList to prefetch upcoming images instead of fixed 12.

---

## 10. Category-Switch Flicker Fix *(June 2025)*

**Problem**  
When toggling between *Services* ↔ *Housing* the cards stayed on-screen but their thumbnails flashed 2-3 times. Root cause:

* `FlatList` reused rows because the `keyExtractor` produced identical keys (`item.id`) for service and housing data sets that happened to share the same numeric IDs.
* Reused rows remounted with new props → `expo-image` re-requested thumbnails → visible flash.
* Extra flicker came from clearing the list (`setItems([])`) before the new fetch resolved.

**Fix**
1. **Stable, category-scoped keys**
   ```js
   const isHousing = selectedCategory === 'Housing';
   keyExtractor={item => `${isHousing ? 'housing' : 'service'}-${item.id}`}
   ```
   (List view adds the index: ``${prefix}-${item.id}-${index}``.)
2. **No premature clearing** – removed the `setItems([])` / `setUserFavorites(new Set())` lines when switching category. The existing cards remain until fresh data arrives.
3. **Image cross-fade** – added `transition={120}` to every `<Image>` from **expo-image** so any unavoidable source change fades instead of flashes.

**Result**  
Zero visible flicker; category switches feel instantaneous.

**To repeat in a new list**
✅ Prefix row keys with a namespace that changes when the *data schema* changes.  
✅ Keep old rows mounted until new data is ready.  
✅ Add a short `transition` prop to images for smoothness.

**Update (final)** — We removed `transition` props after validating the flicker fix. Cached thumbnails now appear instantly without a grey placeholder. Keep cross-fade disabled unless you specifically need a visual dissolve.

---

### Quick Checklist for New Screens
- [ ] Use `getOptimizedImageUrl` for every CDN image.
- [ ] Render with `expo-image` + `cachePolicy="immutable"`.
- [ ] Show grey placeholder until `onLoad` fires.
- [ ] Prefetch visible-soon thumbnails.
- [ ] Apply FlatList perf props.
- [ ] Memoise card components.

Happy shipping!
