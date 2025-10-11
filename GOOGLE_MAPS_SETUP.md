# Google Maps Setup Instructions

## 🗺️ How to Enable Google Maps in Your Dashboard

### Step 1: Get Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project (or select existing)**
   - Click "Select a project" → "New Project"
   - Name it "Tower Crane Monitor" (or any name you prefer)
   - Click "Create"

3. **Enable Google Maps JavaScript API**
   - Go to "APIs & Services" → "Library"
   - Search for "Maps JavaScript API"
   - Click on it and press "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Secure Your API Key (Recommended)**
   - Click on your API key to edit it
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain: `http://localhost:3000/*`
   - Under "API restrictions", select "Restrict key"
   - Choose "Maps JavaScript API"
   - Click "Save"

### Step 2: Add API Key to Your Project

1. **Open your `.env.local` file** in the frontend folder
2. **Add this line:**
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
3. **Replace `your_actual_api_key_here`** with the API key you copied

### Step 3: Restart Your Development Server

1. **Stop your frontend server** (Ctrl+C)
2. **Start it again:**
   ```bash
   cd frontend
   npm run dev
   ```

### Step 4: Test the Map

1. **Login as Manager or Admin**
2. **Go to Dashboard**
3. **You should see the Google Map** with your crane location
4. **Click on the crane marker** to see details

## 🔧 Troubleshooting

### If you still see "Google Maps Not Configured":
- ✅ Check that your `.env.local` file has the correct API key
- ✅ Make sure you restarted the development server
- ✅ Verify the API key is valid in Google Cloud Console
- ✅ Check browser console for any error messages

### If you see "This page didn't load Google Maps correctly":
- ✅ Check that "Maps JavaScript API" is enabled in Google Cloud Console
- ✅ Verify your API key restrictions allow `http://localhost:3000/*`
- ✅ Make sure you're not using a restricted API key

### If the map loads but shows no cranes:
- ✅ Check that you have crane data in your database
- ✅ Verify the crane coordinates are correct
- ✅ Check browser console for any JavaScript errors

## 💰 Cost Information

- **Google Maps API** has a free tier: $200 credit per month
- **Maps JavaScript API** costs $7 per 1,000 requests
- **For development/testing**: Usually stays within free tier
- **For production**: Monitor usage in Google Cloud Console

## 🎯 Current Configuration

- **Location**: Hubballi-Dharwad, Karnataka, India
- **Coordinates**: 15.3647°N, 75.1240°E
- **Map Type**: Satellite view
- **Zoom Level**: 15
- **Interaction**: Manager and Admin roles only

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your API key is correctly configured
3. Make sure all required APIs are enabled
4. Check that your billing account is set up in Google Cloud Console
