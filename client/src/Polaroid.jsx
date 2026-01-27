import { usePhotoUpload } from './hooks/usePhotoUpload';

export default function Polaroid() {
    const { state, actions } = usePhotoUpload();
    const { file, preview, status } = state;
    const { handleImageSelect, uploadPhoto } = actions;

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