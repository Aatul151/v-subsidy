import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';
import { UploadedFile } from '@/api/fileUpload';
import { downloadFile } from '@/utils/fileDownload';
import { FILE_BASE_URL, axiosFileInstance } from '@/api/axiosInstance';

interface FilePreviewDialogProps {
  open: boolean;
  file: UploadedFile | null;
  onClose: () => void;
  onDownloadError?: (error: any) => void;
}

/**
 * Determines file type from MIME type or file extension
 */
const getFileType = (file: UploadedFile): 'image' | 'pdf' | 'video' | 'text' | 'other' => {
  const mimeType = file.mimeType?.toLowerCase() || '';
  const fileName = (file.originalName || file.fileName || '').toLowerCase();
  const extension = fileName.split('.').pop() || '';

  // Check by MIME type first
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('text/')) return 'text';

  // Check by extension
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const textExtensions = ['txt', 'csv', 'json', 'xml', 'md', 'log'];

  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (textExtensions.includes(extension)) return 'text';
  if (extension === 'pdf') return 'pdf';

  return 'other';
};

/**
 * Gets the full URL for the file
 */
const getFileUrl = (fileUrl: string): string => {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return `${FILE_BASE_URL}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
};

export const FilePreviewDialog = ({ open, file, onClose, onDownloadError }: FilePreviewDialogProps) => {
  const [textContent, setTextContent] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string>('');

  useEffect(() => {
    // Cleanup previous blob URL if exists
    if (blobUrlRef.current) {
      window.URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }

    if (open && file) {
      const fileType = getFileType(file);
      const isFullUrl = file.fileUrl.startsWith('http://') || file.fileUrl.startsWith('https://');
      
      // For images, PDFs, and videos, create authenticated blob URLs if needed
      if ((fileType === 'image' || fileType === 'pdf' || fileType === 'video') && !isFullUrl) {
        setLoading(true);
        setError(null);
        const cleanFileUrl = file.fileUrl.startsWith('/') ? file.fileUrl.substring(1) : file.fileUrl;
        
        axiosFileInstance.get(cleanFileUrl, { responseType: 'blob' })
          .then((response) => {
            const blob = new Blob([response.data], { type: file.mimeType || response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            blobUrlRef.current = url;
            setImageUrl(url);
            setLoading(false);
          })
          .catch((_err) => {
            setError('Failed to load file');
            setLoading(false);
          });
      } else if (fileType === 'text') {
        // Load text content for text files
        setLoading(true);
        setError(null);
        const fileUrl = getFileUrl(file.fileUrl);
        const token = localStorage.getItem('token');
        
        fetch(fileUrl, {
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        })
          .then((response) => {
            if (!response.ok) throw new Error('Failed to load file');
            return response.text();
          })
          .then((text) => {
            setTextContent(text);
            setLoading(false);
          })
          .catch((_err) => {
            setError('Failed to load file content');
            setLoading(false);
          });
      } else {
        setTextContent('');
        setImageUrl('');
        setError(null);
      }
    }

    // Cleanup function to revoke blob URLs when component unmounts or file changes
    return () => {
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
      }
    };
  }, [open, file]);

  if (!file) return null;

  const fileType = getFileType(file);
  const displayName = file.originalName || file.fileName || 'File';
  const fileUrl = getFileUrl(file.fileUrl);

  const handleDownload = () => {
    downloadFile(file.fileUrl, displayName, onDownloadError);
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    switch (fileType) {
      case 'image':
        const imageSrc = imageUrl || fileUrl;
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: '70vh',
              overflow: 'auto',
            }}
          >
            <img
              src={imageSrc}
              alt={displayName}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
              onError={() => setError('Failed to load image')}
            />
          </Box>
        );

      case 'pdf':
        const pdfSrc = imageUrl || fileUrl;
        return (
          <Box
            sx={{
              width: '100%',
              height: '70vh',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <iframe
              src={pdfSrc}
              title={displayName}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              onError={() => setError('Failed to load PDF')}
            />
          </Box>
        );

      case 'video':
        const videoSrc = imageUrl || fileUrl;
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: '70vh',
            }}
          >
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
              }}
            >
              <source src={videoSrc} type={file.mimeType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          </Box>
        );

      case 'text':
        return (
          <Box
            sx={{
              maxHeight: '70vh',
              overflow: 'auto',
              p: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
              }}
            >
              {textContent || 'No content'}
            </Typography>
          </Box>
        );

      default:
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              gap: 2,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Preview not available for this file type
            </Typography>
            <Typography variant="body2" color="text.disabled">
              File type: {file.mimeType || 'Unknown'}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Download file" placement="bottom" arrow>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleDownload}
              aria-label="download"
              size="small"
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
};

