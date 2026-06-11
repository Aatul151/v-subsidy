import { axiosFileInstance } from '@/api/axiosInstance';

/**
 * Downloads a file from a URL (supports both full URLs and relative paths)
 * For relative URLs, uses axiosFileInstance for authenticated downloads
 * @param fileUrl - The URL of the file to download (can be full URL or relative path)
 * @param fileName - The name to use for the downloaded file
 * @param onError - Optional error callback function
 */
export const downloadFile = async (
    fileUrl: string,
    fileName: string,
    onError?: (error: any) => void
): Promise<void> => {
    try {
        // Check if fileUrl is a full URL or relative path
        const isFullUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');

        if (isFullUrl) {
            // For full URLs, try direct download first
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // For relative URLs, use axiosFileInstance (without /api prefix)
            // Remove leading slash from fileUrl if present
            const cleanFileUrl = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;

            const response = await axiosFileInstance.get(cleanFileUrl, {
                responseType: 'blob', // Important: set response type to blob
            });

            // Create a blob URL and trigger download
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
    } catch (error: any) {
        console.error('Error downloading file:', error);

        // Fallback to direct link if axios fails
        try {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (fallbackError) {
            // If fallback also fails, call error handler
            if (onError) {
                onError(error);
            }
        }
    }
};

