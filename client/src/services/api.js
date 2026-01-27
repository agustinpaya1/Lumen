export const PhotoService = {
    uploadPhoto: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/photos/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            throw new Error('Error subiendo la foto');
        }

        const data = await res.json();
        return data;
    }
};
