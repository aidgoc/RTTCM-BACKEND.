# 🔧 Manual MongoDB Changes Guide

## ✅ **Auto-Refresh System**
- **Frontend refreshes every 10 seconds** automatically
- **Changes appear within 10 seconds** of making them in MongoDB
- **No manual sync required** - it's completely automatic

## 🎯 **Common Manual Changes You Can Make**

### **1. Change Limit Switch Status**

#### **Make a Limit Switch FAIL:**
```javascript
// Make TC-101's ls1 FAIL
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      'lastStatusRaw.ls1': 'FAIL',
      lastSeen: new Date()
    }
  }
);

// Make TC-901's ls2 FAIL
await Crane.updateOne(
  { craneId: 'TC-901' },
  { 
    $set: { 
      'lastStatusRaw.ls2': 'FAIL',
      lastSeen: new Date()
    }
  }
);
```

#### **Make a Limit Switch OK:**
```javascript
// Make TC-101's ls1 OK
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      'lastStatusRaw.ls1': 'OK',
      lastSeen: new Date()
    }
  }
);
```

### **2. Change Crane Online/Offline Status**

#### **Make Crane Offline:**
```javascript
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      online: false,
      lastSeen: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }
  }
);
```

#### **Make Crane Online:**
```javascript
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      online: true,
      lastSeen: new Date()
    }
  }
);
```

### **3. Change Load Data**

#### **Update Load and Utilization:**
```javascript
// Set TC-901 to 90% capacity (4950kg out of 5500kg)
await Crane.updateOne(
  { craneId: 'TC-901' },
  { 
    $set: { 
      'lastStatusRaw.load': 4950,
      'lastStatusRaw.util': 90,
      lastSeen: new Date()
    }
  }
);

// Set TC-101 to overload (7000kg out of 6600kg)
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      'lastStatusRaw.load': 7000,
      'lastStatusRaw.util': 106, // Over 100% = overload
      lastSeen: new Date()
    }
  }
);
```

### **4. Change All Limit Switches at Once**

```javascript
// Make all limit switches FAIL for TC-101
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      'lastStatusRaw.ls1': 'FAIL',
      'lastStatusRaw.ls2': 'FAIL',
      'lastStatusRaw.ls3': 'FAIL',
      'lastStatusRaw.ls4': 'FAIL',
      lastSeen: new Date()
    }
  }
);
```

## 🚀 **Quick Test Scripts**

### **Test 1: Make Everything FAIL**
```javascript
// Run this to test failure states
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      online: false,
      'lastStatusRaw.ls1': 'FAIL',
      'lastStatusRaw.ls2': 'FAIL',
      'lastStatusRaw.ls3': 'FAIL',
      'lastStatusRaw.ls4': 'FAIL',
      'lastStatusRaw.load': 7000,
      'lastStatusRaw.util': 106,
      lastSeen: new Date(Date.now() - 10 * 60 * 1000)
    }
  }
);
```

### **Test 2: Make Everything OK**
```javascript
// Run this to test normal operation
await Crane.updateOne(
  { craneId: 'TC-101' },
  { 
    $set: { 
      online: true,
      'lastStatusRaw.ls1': 'OK',
      'lastStatusRaw.ls2': 'OK',
      'lastStatusRaw.ls3': 'OK',
      'lastStatusRaw.ls4': 'OK',
      'lastStatusRaw.load': 3000,
      'lastStatusRaw.util': 45,
      lastSeen: new Date()
    }
  }
);
```

## 📊 **What You'll See in the Frontend**

### **Limit Switch Status:**
- 🟢 **Green Circle**: OK status
- 🔴 **Red Pulsing Circle**: FAIL status (with glow effect)
- ⚪ **Gray Pulsing Circle**: UNKNOWN status

### **Crane Card:**
- **Online**: Green WiFi icon with blinking animation
- **Offline**: Red crossed-out WiFi icon (static)
- **Load**: Shows current load vs SWL (e.g., "4.9T - 5.5T")
- **Utilization**: Shows hours and minutes

### **Dashboard Cards:**
- **Total Cranes**: Tower crane logo
- **Online**: Blinking WiFi icon with count

## ⏱️ **Timing**
- **Changes appear within 10 seconds** automatically
- **No page refresh needed**
- **Works in background** even when tab is not active

## 🔍 **Verification**
After making changes, you can verify they worked by:
1. **Check the frontend** - changes should appear within 10 seconds
2. **Check the database** - run a query to see current values
3. **Check the sync button** - should show updated counts when clicked

## 🎯 **Example Workflow**
1. **Make changes in MongoDB** using the scripts above
2. **Wait 10 seconds** for auto-refresh
3. **Check frontend** - you should see the changes
4. **Make more changes** to test different scenarios
5. **Use sync button** if you want immediate refresh

The system is designed to be **completely automatic** - no manual intervention needed!
