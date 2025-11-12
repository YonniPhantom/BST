const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

// Función para detectar dispositivos USB en macOS
function getUSBDevicesMacOS() {
  try {
    console.log('🔍 Detectando dispositivos USB en macOS...');
    
    // Usar system_profiler para obtener información de dispositivos USB
    const output = execSync('system_profiler SPUSBDataType -json', { 
      encoding: 'utf8',
      timeout: 10000 // 10 segundos timeout
    });
    
    const data = JSON.parse(output);
    const devices = [];
    
    function extractDevices(items) {
      for (const item of items || []) {
        if (item.vendor_id && item.product_id) {
          const vendorId = parseInt(item.vendor_id.replace('0x', ''), 16);
          const productId = parseInt(item.product_id.replace('0x', ''), 16);
          
          devices.push({
            vendorId: vendorId,
            productId: productId,
            name: item._name || 'Unknown Device',
            manufacturer: item.manufacturer || 'Unknown',
            serialNumber: item.serial_num || 'Unknown',
            locationId: item.location_id || 'Unknown'
          });
          
          console.log(`📱 Dispositivo encontrado: ${item._name} (${item.vendor_id}:${item.product_id})`);
        }
        
        // Recursivamente buscar en sub-items
        if (item._items) {
          extractDevices(item._items);
        }
      }
    }
    
    extractDevices(data.SPUSBDataType);
    
    console.log(`✅ ${devices.length} dispositivos USB encontrados`);
    return devices;
    
  } catch (error) {
    console.error('❌ Error ejecutando system_profiler:', error);
    return [];
  }
}

// Función para detectar dispositivos USB en Linux
function getUSBDevicesLinux() {
  try {
    console.log('🔍 Detectando dispositivos USB en Linux...');
    
    const output = execSync('lsusb -v', { 
      encoding: 'utf8',
      timeout: 10000
    });
    
    const devices = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4}) (.+)/);
      if (match) {
        const [, bus, device, vendorId, productId, name] = match;
        devices.push({
          vendorId: parseInt(vendorId, 16),
          productId: parseInt(productId, 16),
          name: name.trim(),
          manufacturer: 'Unknown',
          serialNumber: 'Unknown',
          locationId: `Bus ${bus} Device ${device}`
        });
      }
    }
    
    console.log(`✅ ${devices.length} dispositivos USB encontrados`);
    return devices;
    
  } catch (error) {
    console.error('❌ Error ejecutando lsusb:', error);
    return [];
  }
}

// Función para detectar dispositivos USB en Windows
function getUSBDevicesWindows() {
  try {
    console.log('🔍 Detectando dispositivos USB en Windows...');
    
    const output = execSync('wmic path Win32_USBControllerDevice get Dependent', { 
      encoding: 'utf8',
      timeout: 10000
    });
    
    // En Windows es más complejo, necesitaríamos usar PowerShell o WMI
    // Por simplicidad, retornamos array vacío por ahora
    console.log('⚠️ Detección en Windows requiere implementación específica');
    return [];
    
  } catch (error) {
    console.error('❌ Error en detección Windows:', error);
    return [];
  }
}

// Endpoint para obtener dispositivos USB del sistema
router.get('/check-usb-devices', async (req, res) => {
  try {
    console.log('🔌 Iniciando detección de dispositivos USB...');
    
    let devices = [];
    
    // Detectar según el sistema operativo
    switch (process.platform) {
      case 'darwin': // macOS
        devices = getUSBDevicesMacOS();
        break;
      case 'linux':
        devices = getUSBDevicesLinux();
        break;
      case 'win32': // Windows
        devices = getUSBDevicesWindows();
        break;
      default:
        console.log('⚠️ Sistema operativo no soportado:', process.platform);
    }
    
    // Filtrar dispositivos que podrían ser escáneres
    const scannerDevices = devices.filter(device => {
      // Bakeway ES-536 típicamente usa chip CH340/CH341
      if (device.vendorId === 0x1a86) return true;
      
      // Otros chips USB-Serial comunes en escáneres
      if (device.vendorId === 0x067b) return true; // Prolific
      if (device.vendorId === 0x0403) return true; // FTDI
      
      // Escáneres conocidos
      if (device.vendorId === 0x0c2e) return true; // Honeywell
      if (device.vendorId === 0x05e0) return true; // Symbol
      if (device.vendorId === 0x05f9) return true; // Datalogic
      
      // Detectar por nombre
      if (device.name && /bakeway|scanner|barcode|qr/i.test(device.name)) return true;
      
      return false;
    });
    
    console.log(`🎯 ${scannerDevices.length} posibles escáneres encontrados`);
    
    res.json({
      success: true,
      platform: process.platform,
      totalDevices: devices.length,
      scannerDevices: scannerDevices,
      devices: scannerDevices // Para compatibilidad
    });
    
  } catch (error) {
    console.error('❌ Error en detección de dispositivos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      platform: process.platform
    });
  }
});

module.exports = router;
