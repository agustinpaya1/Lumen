import { useState } from 'react';
import imageCompression from 'browser-image-compression';

export default function Polaroid() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, compressing, uploading, success, error

    const handleImageSelect = async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        // 1. Mostrar preview
        setPreview(URL.createObjectURL(originalFile));
        setStatus('compressing');

        // 2. Comprimir imagen (OBLIGATORIO para Vercel/Móvil)
        const options = {
            maxSizeMB: 1,              // Máx 1MB
            maxWidthOrHeight: 1920,    // Full HD
            useWebWorker: true
        };

        try {
            const compressedFile = await imageCompression(originalFile, options);
            setFile(compressedFile);
            setStatus('idle');
            console.log(`Comprimido: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    const uploadPhoto = async () => {
        if (!file) return;
        setStatus('uploading');

        const formData = new FormData();
        // 'file' es el nombre del parámetro que pusimos en Django Ninja (api.py)
        formData.append('file', file);

        try {
            // El proxy redirige esto a http://127.0.0.1:8000/api/photos/upload
            const res = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Error subiendo');

            const data = await res.json();
            console.log("Respuesta Server:", data);

            setStatus('success');

            // Resetear después de 3 segundos para otra foto
            setTimeout(() => {
                setFile(null);
                setPreview(null);
                setStatus('idle');
            }, 3000);

        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            {/* Tarjeta Polaroid */}
            <div className="bg-white p-4 pb-16 shadow-2xl rotate-1 transition-all duration-500 hover:rotate-0 w-full max-w-sm border border-gray-200">

                {/* Visor */}
                <div className="bg-gray-900 aspect-square w-full mb-6 relative overflow-hidden flex items-center justify-center group cursor-pointer">
                    {preview ? (
                        <img src={preview} alt="Tu foto" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-gray-400 text-center">
                            <span className="text-5xl block mb-2">📷</span>
                            <span className="text-sm">Toca para hacer foto</span>
                        </div>
                    )}

                    {/* Input invisible: Solo activo si no se está subiendo */}
                    {status !== 'uploading' && status !== 'success' && (
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment" // Intenta abrir cámara trasera en móvil
                            onChange={handleImageSelect}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                    )}
                </div>

                {/* Botonera / Feedback */}
                <div className="text-center h-12 flex items-center justify-center font-polaroid text-xl text-gray-800">

                    {status === 'compressing' && <span className="animate-pulse text-gray-500">Preparando... ⚙️</span>}

                    {status === 'idle' && file && (
                        <button
                            onClick={uploadPhoto}
                            className="bg-red-600 text-white font-sans font-bold text-sm py-3 px-8 rounded-full shadow-lg hover:bg-red-700 transform hover:scale-105 transition"
                        >
                            REVELAR FOTO
                        </button>
                    )}

                    {status === 'uploading' && (
                        <span className="text-blue-600 animate-bounce">Subiendo... ☁️</span>
                    )}

                    {status === 'success' && (
                        <span className="text-green-600 rotate-[-2deg] scale-125 block">¡Guardada! 🎉</span>
                    )}

                    {status === 'error' && (
                        <span className="text-red-500 font-sans text-sm">Error 😢 Intenta de nuevo</span>
                    )}
                </div>
            </div>
        </div>
    );
}