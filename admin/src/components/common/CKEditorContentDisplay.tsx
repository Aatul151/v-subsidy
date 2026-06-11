import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Close as CloseIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useState } from 'react';

interface CKEditorContentDisplayProps {
    content: string;
    maxLength?: number;
    showViewButton?: boolean;
}

/**
 * Strips HTML tags and returns plain text
 */
const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

/**
 * Truncates text to a maximum length
 */
const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
};

export const CKEditorContentDisplay = ({
    content,
    maxLength = 100,
    showViewButton = true
}: CKEditorContentDisplayProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!content || content.trim() === '') {
        return (
            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No content
            </Typography>
        );
    }

    // Strip HTML tags for preview
    const plainText = stripHtmlTags(content);
    const isLongContent = plainText.length > maxLength;
    const previewText = isLongContent ? truncateText(plainText, maxLength) : plainText;

    const handleOpenDialog = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    // If content has HTML or is long, show only the button
    const shouldShowButton = showViewButton && (isLongContent || content.includes('<'));

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                {shouldShowButton ? (
                    <Button
                        size="small"
                        startIcon={<ViewIcon fontSize="small" />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog();
                        }}
                        sx={{
                            minWidth: 'auto',
                            px: 1,
                            py: 0.5,
                            fontSize: '0.75rem',
                            textTransform: 'none',
                        }}
                    >
                        View Content
                    </Button>
                ) : (
                    <Typography
                        variant="body2"
                        sx={{
                            wordBreak: 'break-word',
                            color: 'text.primary',
                            fontSize: '0.875rem',
                        }}
                    >
                        {previewText}
                    </Typography>
                )}
            </Box>

            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="h6">Content Preview</Typography>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={handleCloseDialog}
                        aria-label="close"
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    sx={{
                        '& .ck-content': {
                            padding: 2,
                            fontSize: '1rem',
                            lineHeight: 1.6,
                        },
                        '& p': {
                            marginBottom: '1em',
                        },
                        '& h1, & h2, & h3, & h4, & h5, & h6': {
                            marginTop: '1em',
                            marginBottom: '0.5em',
                            fontWeight: 600,
                        },
                        '& ul, & ol': {
                            marginLeft: '1.5em',
                            marginBottom: '1em',
                        },
                        '& table': {
                            borderCollapse: 'collapse',
                            width: '100%',
                            marginBottom: '1em',
                        },
                        '& table td, & table th': {
                            border: '1px solid #ddd',
                            padding: '8px',
                        },
                        '& img': {
                            maxWidth: '100%',
                            height: 'auto',
                        },
                        '& blockquote': {
                            borderLeft: '4px solid #ddd',
                            paddingLeft: '1em',
                            marginLeft: 0,
                            fontStyle: 'italic',
                        },
                        overflow: 'auto',
                    }}
                >
                    <Box
                        dangerouslySetInnerHTML={{ __html: content }}
                        sx={{
                            '& *': {
                                maxWidth: '100%',
                            },
                        }}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
};

