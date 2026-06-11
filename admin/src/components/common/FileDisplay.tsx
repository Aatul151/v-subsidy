import { Box, Typography, Link, IconButton, Tooltip } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { UploadedFile } from '@/api/fileUpload';
import { AppPopover } from './AppPopover';
import { downloadFile } from '@/utils/fileDownload';
import { FilePreviewDialog } from './FilePreviewDialog';
import { useState } from 'react';

interface FileDisplayProps {
    /**
     * The file value - can be a single UploadedFile, an array of UploadedFile, or null/undefined
     */
    fieldValue: any;
    /**
     * Optional error handler for file download errors
     */
    onDownloadError?: (error: any) => void;
}

/**
 * Shared component for displaying file fields
 * Used in both table view (FormEntries) and form view mode
 * Displays single files as direct links, multiple files with a popover
 */
export const FileDisplay = ({ fieldValue, onDownloadError }: FileDisplayProps) => {
    const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
        return (
            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No files
            </Typography>
        );
    }

    // Normalize to array
    let files: UploadedFile[] = [];
    if (Array.isArray(fieldValue)) {
        files = fieldValue.filter((fileData: any) =>
            fileData && typeof fileData === 'object' && 'fileUrl' in fileData
        );
    } else if (typeof fieldValue === 'object' && fieldValue !== null && 'fileUrl' in fieldValue) {
        files = [fieldValue as UploadedFile];
    }

    if (files.length === 0) {
        return (
            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No files
            </Typography>
        );
    }

    const handlePreview = (file: UploadedFile, e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewFile(file);
        setPreviewOpen(true);
    };

    const handleClosePreview = () => {
        setPreviewOpen(false);
        setPreviewFile(null);
    };

    // Single file - display with view and download options
    if (files.length === 1) {
        const fileData = files[0];
        const displayName = fileData.originalName || fileData.fileName || 'Download file';

        return (
            <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={`Click to download: ${displayName}`} placement="bottom" arrow>
                        <Link
                            component="button"
                            variant="body2"
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(fileData.fileUrl, displayName, onDownloadError);
                            }}
                            sx={{
                                textAlign: 'left',
                                color: 'primary.main',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                textOverflow: 'ellipsis',
                                width: '200px',
                                overflow: 'hidden',
                                '&:hover': {
                                    textDecoration: 'underline',
                                    color: 'primary.dark',
                                },
                            }}
                        >
                            {displayName}
                        </Link>
                    </Tooltip>
                    <Tooltip title="Preview file" placement="bottom" arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => handlePreview(fileData, e)}
                            sx={{
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
                <FilePreviewDialog
                    open={previewOpen}
                    file={previewFile}
                    onClose={handleClosePreview}
                    onDownloadError={onDownloadError}
                />
            </>
        );
    }

    // Multiple files - show "View files" label/link with popover
    return (
        <Box sx={{ display: 'flex', height: '100%', alignItems: 'center' }}>
            <AppPopover
                trigger={
                    <Link
                        component="button"
                        variant="body2"
                        sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            fontSize: '0.775rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 0.5,
                            '&:hover': {
                                textDecoration: 'underline',
                                color: 'primary.dark',
                            },
                        }}
                    >
                        <InsertDriveFileIcon sx={{ fontSize: 16 }} />
                        View files ({files.length})
                    </Link>
                }
                title={`All Files (${files.length})`}
                maxWidth={300}
                maxHeight={400}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {files.map((fileData, index) => {
                        const displayName = fileData.originalName || fileData.fileName || `File ${index + 1}`;
                        return (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 0.75,
                                    borderRadius: 1,
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                }}
                            >
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Tooltip title={displayName} placement="bottom" arrow>
                                        <Link
                                            component="a"
                                            variant="body2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                downloadFile(fileData.fileUrl, displayName, onDownloadError);
                                            }}
                                            sx={{
                                                color: 'primary.main',
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                display: 'block',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                width: '200px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {index + 1}. {displayName}
                                        </Link>
                                    </Tooltip>
                                </Box>
                                <Tooltip title="Preview file" placement="bottom" arrow>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handlePreview(fileData, e)}
                                        sx={{
                                            flexShrink: 0,
                                            '&:hover': {
                                                backgroundColor: 'action.hover',
                                            },
                                        }}
                                    >
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        );
                    })}
                </Box>
                <FilePreviewDialog
                    open={previewOpen}
                    file={previewFile}
                    onClose={handleClosePreview}
                    onDownloadError={onDownloadError}
                />
            </AppPopover>
        </Box>
    );
};

