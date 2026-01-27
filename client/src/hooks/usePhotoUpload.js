import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { PhotoService } from '../services/api';

export const usePhotoUpload = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, compressing, uploading, success, error

    const handleImageSelect = useCallback(async (e) => {
        const originalFile = e.target.files[0];
        if (!originalFile) return;

        // 1. Mostrar preview
        setPreview(URL.createObjectURL(originalFile));
        setStatus('compressing');

        // 2. Comprimir imagen
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        };

        try {
            const compressedFile = await imageCompression(originalFile, options);
            setFile(compressedFile);
            setStatus('idle');
            // Console log removed or kept for debugging if needed, keeping simple for now
            console.log(`Comprimido: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    }, []);

    const uploadPhoto = useCallback(async () => {
        if (!file) return;
        setStatus('uploading');

        try {
            const data = await PhotoService.uploadPhoto(file);
            console.log("Respuesta Server:", data);
            setStatus('success');

            // Resetear después de 3 segundos
            setTimeout(() => {
                setFile(null);
                setPreview(null);
                setStatus('idle');
            }, 3000);

        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    }, [file]);

    return {
        state: { file, preview, status },
        actions: { handleImageSelect, uploadPhoto }
    };
};
