# Manual Testing Guide for SuperCafé Debt List Fix

## Issue Description
When changing a comanda status from "Entregado" (Delivered) to "Deuda" (Debt), the debt list doesn't update until the page is refreshed or an external change is received.

## Root Cause
The `DB.put()` function in `src/db.js` was updating the document cache BEFORE calling `onChange()` to notify subscribers. This caused `onChange()` to think no change occurred (since it compared the new value with itself in the cache), so it didn't trigger the UI update callbacks.

## Fix Applied
Modified `src/db.js` to call `onChange()` immediately after `local.put()`, allowing it to detect the change by comparing with the old cached value and notify all subscribers.

## How to Test Manually

### Prerequisites
1. Build the application: `python3 build.py`
2. Serve the application: `cd dist && python3 -m http.server 8000`
3. Open browser and navigate to `http://localhost:8000`
4. Login with a test group code and secret key

### Test Steps

1. **Navigate to SuperCafé module**
   - Click on "Cafetería" in the navigation menu

2. **Create a test comanda**
   - Click "Nueva comanda" button
   - Select a person from the dropdown
   - Add items to the order
   - Click "Guardar" to save

3. **Change comanda status to "Entregado"**
   - In the "Todas las comandas" list, find your test comanda
   - Click on the "Estado" dropdown for your comanda
   - Select "Entregado" (Delivered)
   - **Verify**: The comanda row turns light green
   - **Verify**: The comanda does NOT appear in the "Deudas" section

4. **Change comanda status to "Deuda"** (THE FIX IS TESTED HERE)
   - In the "Todas las comandas" list, click the "Estado" dropdown again
   - Select "Deuda" (Debt)
   - **Expected Result (with fix)**: 
     - The comanda row immediately turns light purple/pink
     - The comanda immediately appears in the "Deudas" section below
     - NO page refresh is needed
   - **Old Behavior (without fix)**:
     - The comanda row would turn purple but NOT appear in "Deudas" section
     - You would need to refresh the page to see it in "Deudas"

5. **Verify the change persists**
   - Refresh the page
   - Navigate back to SuperCafé
   - **Verify**: The comanda is still in "Deuda" status and appears in the "Deudas" section

### Expected Behavior After Fix
- Changing any comanda status should immediately update BOTH list sections ("Todas las comandas" and "Deudas")
- No page refresh should be needed to see the comanda appear/disappear from the "Deudas" section
- The fix ensures local database changes trigger the same UI updates as external/replicated changes

## Technical Details

### Code Change Summary
**File**: `src/db.js`

**Before (lines 135-141)**:
```javascript
await local.put(doc);

try { docCache[_id] = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data); } catch (e) {}

// FIX: manually trigger map() callbacks for local update
onChange({ doc: doc });
```

**After (lines 135-139)**:
```javascript
await local.put(doc);

// FIX: manually trigger map() callbacks for local update
// onChange will update docCache and notify all subscribers
onChange({ doc: doc });
```

### Why This Fix Works
1. `onChange()` checks if data changed by comparing with cached value (line 100-101 in db.js)
2. If changed, it updates the cache and notifies all subscribers (line 102-109)
3. By calling `onChange()` BEFORE updating the cache, it can detect the change
4. Previously, cache was updated first, so `onChange()` saw no difference and didn't notify subscribers

## Affected Modules
- **SuperCafé**: Primary affected module - debt list now updates on status changes
- **All other modules using `DB.put()`**: Now correctly trigger change listeners for local updates

## Regression Testing
No regressions expected since:
- This is a pure fix for local change detection
- External/replicated changes continue to work as before (PouchDB's live changes feed)
- `onChange()` function logic unchanged, only call timing adjusted
