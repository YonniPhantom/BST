"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../shared/Api";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ✅ Encabezados que esperamos en la primera fila del Excel
const EXPECTED_HEADERS = ["NUM CONTROL", "NOMBRE COMPLETO", "CARRERA"];

const Home = () => {
  const navigate = useNavigate();
  const router = { push: navigate };
  const [status, setStatus] = useState("Verificando conexión a base de datos...");
  const excelInputRef = useRef<HTMLInputElement>(null);

  // 🧠 Función para validar el formato del Excel
  async function validateExcelFormat(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Leer primera hoja
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];

          // Extraer encabezados
          const range = XLSX.utils.decode_range(worksheet["!ref"]!);
          const headers: string[] = [];

          for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            headers.push(cell?.v?.toString().trim() || "");
          }

          // Validar encabezados
          const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
          if (missing.length > 0) {
            Swal.fire({
              icon: "error",
              title: "Formato incorrecto",
              text: `Faltan las columnas: ${missing.join(", ")}`,
              confirmButtonText: "Ok",
              allowEscapeKey: false,
              allowOutsideClick: false,
            }).then(() => {
              navigate("/");
            });
            resolve(false);
          } else {
            resolve(true);
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error al leer el archivo",
            text: "El archivo Excel parece estar dañado o vacío.",
            confirmButtonText: "Ok",
            allowEscapeKey: false,
            allowOutsideClick: false,
          }).then(() => {
            window.location.reload();
          });
          resolve(false);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  }

  const handleExcelSelection = async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("excel", file);

      const res = await fetch(`${API_BASE_URL}/api/health/upload-excel`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error del servidor:", errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al subir el Excel:", error);
      return false;
    }
  };

  // 🟢 Manejo de selección de Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Swal.close(); // cerrar modal
      setStatus("🛠️ Validando formato del Excel...");
      await delay(500);

      const isValid = await validateExcelFormat(file);
      if (!isValid) {
        // La función validateExcelFormat ya maneja el error y cierra la app
        e.target.value = "";
        return;
      }

      setStatus("✅ Excel válido. Procesando...");
      const success = await handleExcelSelection(file);

      if (success) {
        setStatus("✅ Archivo Excel seleccionado correctamente.");
        await delay(1000);
        setStatus("Comprobando conexión a internet...");

        if (!await checkInternetConnection()) {
          await Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo conectar a internet. Intenta de nuevo.",
            confirmButtonText: "Ok",
            allowEscapeKey: false,
            allowOutsideClick: false,
          }).then(() => {
            window.location.reload();
          });
          return;
        }

        setStatus("✅ Conexión a internet establecida.");
        await delay(1000);
        setStatus("🚀 Cargando aplicación...");
        await delay(1000);
        setStatus("Bienvenido 📚");

        await delay(1000);
        router.push("/dashboard");
      } else {
        setStatus("❌ Error al procesar el archivo Excel.");
        await delay(1000);

        // Intentar obtener más información del error
        let errorMessage = "Hubo un error al procesar el archivo. Verifica que el servidor esté funcionando.";

        try {
          // Verificar si el servidor está disponible
          const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
          if (!healthCheck.ok) {
            errorMessage = "El servidor no está disponible. Asegúrate de que esté ejecutándose.";
          }
        } catch (error) {
          errorMessage = "No se puede conectar con el servidor. Verifica que esté ejecutándose.";
        }

        const retryResult = await Swal.fire({
          icon: "error",
          title: "Error al procesar archivo",
          text: errorMessage,
          showCancelButton: true,
          confirmButtonText: "Intentar de nuevo",
          cancelButtonText: "Salir",
          allowEscapeKey: false,
          allowOutsideClick: false,
        });

        if (retryResult.isConfirmed) {
          excelInputRef.current?.click();
        } else {
          window.location.reload();
        }
      }
    }
    // reset para permitir seleccionar el mismo archivo 2 veces seguidas
    e.target.value = "";
  };

  const startupFlow = async () => {
    try {
      // Paso 1: Verificar DB
      setStatus("🔍 Verificando base de datos...");
      await delay(2000);

      let dbOk = true;
      let backendMessage = "No se encontró la base de datos. ¿Quieres crear una nueva?";

      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        dbOk = res.ok;

        // Si no está OK, intentar obtener el mensaje del backend
        if (!res.ok && res.status === 404) {
          try {
            const data = await res.json();
            if (data.message) {
              backendMessage = data.message;
            }
          } catch (parseError) {
            console.log("Error parseando respuesta del backend:", parseError);
          }
        }
      } catch (error) {
        console.log("Error conectando con el backend:", error);
        dbOk = false;
      }

      if (!dbOk) {

        const { isConfirmed } = await Swal.fire({
          icon: "info",
          title: "Base de datos",
          text: backendMessage,
          showCancelButton: true,
          confirmButtonText: "Crear nueva base de datos",
          cancelButtonText: "Salir",
          allowEscapeKey: false,
          allowOutsideClick: false,
        });

        if (!isConfirmed) {
          window.location.reload();
          return;
        }

        setStatus("🛠️ Creando base de datos...");
        await delay(600);

        try {
          const createRes = await fetch(`${API_BASE_URL}/api/health`, { method: "POST" });
          if (!createRes.ok) {
            const errorData = await createRes.json();
            throw new Error(errorData.error || "No se pudo crear la base de datos");
          }

          const successData = await createRes.json();
          setStatus("✅ " + (successData.message || "Base de datos creada correctamente."));
          await delay(2000);
        } catch (error) {
          await Swal.fire({
            icon: "error",
            title: "Error al crear base de datos",
            text: (error as Error).message,
            confirmButtonText: "Ok",
            allowEscapeKey: false,
            allowOutsideClick: false,
          });
          window.location.reload();
          return;
        }
      } else {
        setStatus("✅ Base de datos encontrada.");
        await delay(2000);
      }

      // Paso 2: Verificar Excel
      setStatus("📂 Verificando archivo Excel de alumnos...");
      await delay(600);

      try {
        const excelRes = await fetch(`${API_BASE_URL}/api/health/check-excel`);

        if (excelRes.ok) {
          // Excel encontrado y válido
          const data = await excelRes.json();
          setStatus(`✅ ${data.message || "Excel encontrado y válido."}`);
          await delay(1000);
        } else if (excelRes.status === 404) {
          // Excel no encontrado
          const data = await excelRes.json();
          const result = await Swal.fire({
            icon: "info",
            title: "Archivo Excel requerido",
            text: data.message || "No se encontró el archivo Excel de alumnos. ¿Quieres seleccionar uno?",
            showCancelButton: true,
            confirmButtonText: "Seleccionar Excel",
            cancelButtonText: "Salir",
            allowEscapeKey: false,
            allowOutsideClick: false,
          });

          if (!result.isConfirmed) {
            window.location.reload();
            return;
          }

          // Usuario confirmó, abrir selector de archivos
          excelInputRef.current?.click();
          return; // El handleFileChange continuará el flujo
        } else if (excelRes.status === 400) {
          // Excel existe pero formato inválido
          const data = await excelRes.json();
          await Swal.fire({
            icon: "error",
            title: "Formato de Excel incorrecto",
            text: data.message || "El archivo Excel no tiene el formato correcto",
            confirmButtonText: "Ok",
            allowEscapeKey: false,
            allowOutsideClick: false,
          });

          // Preguntar si quiere seleccionar otro archivo
          const retryResult = await Swal.fire({
            icon: "question",
            title: "¿Seleccionar otro archivo?",
            text: "¿Quieres seleccionar un archivo Excel con el formato correcto?",
            showCancelButton: true,
            confirmButtonText: "Seleccionar otro",
            cancelButtonText: "Salir",
            allowEscapeKey: false,
            allowOutsideClick: false,
          });

          if (retryResult.isConfirmed) {
            excelInputRef.current?.click();
            return;
          } else {
            window.location.reload();
            return;
          }
        } else {
          // Error del servidor
          const errorData = await excelRes.json().catch(() => ({}));
          throw new Error(errorData.message || "Error al verificar el archivo Excel");
        }
      } catch (error) {
        console.error("Error verificando Excel:", error);
        await Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: (error as Error).message || "No se pudo conectar con el servidor",
          confirmButtonText: "Ok",
          allowEscapeKey: false,
          allowOutsideClick: false,
        }).then(() => {
          window.location.reload();
        });
        return;
      }

      // Paso 3: Verificar conexión a internet
      setStatus("🌐 Comprobando conexión a internet...");
      await delay(600);

      if (!await checkInternetConnection()) {
        await Swal.fire({
          icon: "error",
          title: "Sin conexión a internet",
          text: "No se pudo conectar a internet. Verifica tu conexión.",
          confirmButtonText: "Ok",
          allowEscapeKey: false,
          allowOutsideClick: false,
        }).then(() => {
          window.location.reload();
        });
        return;
      }

      setStatus("✅ Conexión a internet establecida.");
      await delay(1000);
      setStatus("🚀 Cargando aplicación...");
      await delay(1000);
      setStatus("Bienvenido 📚");
      await delay(1000);

      router.push("/dashboard");
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: (error as Error).message || "Error inesperado",
        confirmButtonText: "Ok",
        allowEscapeKey: false,
        allowOutsideClick: false,
      }).then(() => {
        window.location.reload();
      });
    }
  };

  const checkInternetConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal
      });

      clearTimeout(timeout);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    startupFlow();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4 overflow-hidden">
      {/* Input oculto */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Partículas */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => {
          const seedX1 = (i * 123.456) % 100;
          const seedY1 = (i * 789.012) % 100;
          const seedX2 = ((i + 15) * 234.567) % 100;
          const seedY2 = ((i + 15) * 890.123) % 100;
          const duration = 25 + (i % 15);

          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-20"
              initial={{ x: `${seedX1}%`, y: `${seedY1}%` }}
              animate={{ x: `${seedX2}%`, y: `${seedY2}%` }}
              transition={{ duration, repeat: Infinity, ease: "linear" }}
            />
          );
        })}
      </div>

      {/* Pantalla de carga */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.8, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-32 h-32 mx-auto bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="text-4xl font-bold text-white"
            >
              BST
            </motion.span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-4xl md:text-6xl font-light text-black mb-8"
        >
          Cargando
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex justify-center space-x-2"
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-cyan-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2, ease: "easeInOut" }}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-8 mx-auto max-w-xs"
        >
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-8 mx-auto max-w-xs"
        >
          <p className="text-lg text-black">{status}</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
