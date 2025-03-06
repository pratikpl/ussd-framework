// src/pages/FlowDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Typography,
    Box,
    Paper,
    Tabs,
    Tab,
    Button,
    TextField,
    Grid,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Breadcrumbs,
    Link
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon,
    Preview as PreviewIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import Editor from "@monaco-editor/react";

// Import Monaco Editor
import MonacoEditor from 'react-monaco-editor';

const FlowDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isEditMode = location.search.includes('edit=true');

    const [flow, setFlow] = useState(null);
    const [originalFlow, setOriginalFlow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [tabValue, setTabValue] = useState(isEditMode ? 0 : 1);
    const [jsonValid, setJsonValid] = useState(true);
    const [jsonError, setJsonError] = useState(null);

    // Fetch flow on component mount
    useEffect(() => {
        fetchFlow();
    }, [id]);

    // Fetch flow from API
    const fetchFlow = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/flows/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const flowData = response.data.data;
            setFlow(flowData);
            setOriginalFlow(JSON.parse(JSON.stringify(flowData))); // Deep copy
        } catch (err) {
            console.error('Error fetching flow:', err);
            setError('Failed to fetch USSD flow. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle tab change
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Handle JSON editor change
    const handleEditorChange = (value) => {
        try {
            const parsedValue = JSON.parse(value);
            setFlow(parsedValue);
            setJsonValid(true);
            setJsonError(null);
        } catch (err) {
            setJsonValid(false);
            setJsonError(err.message);
        }
    };

    // Save flow changes
    const handleSave = async () => {
        if (!jsonValid) {
            alert('Please fix JSON errors before saving');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/flows/${id}`, flow, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setOriginalFlow(JSON.parse(JSON.stringify(flow))); // Update original copy
            alert('Flow saved successfully');
        } catch (err) {
            console.error('Error saving flow:', err);
            setError('Failed to save flow changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Go back to flow list
    const handleBack = () => {
        navigate('/flows');
    };

    // Check if there are unsaved changes
    const hasUnsavedChanges = () => {
        if (!flow || !originalFlow) return false;
        return JSON.stringify(flow) !== JSON.stringify(originalFlow);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!flow) {
        return (
            <Box>
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error || 'Flow not found'}
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    sx={{ mt: 2 }}
                >
                    Back to Flows
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header with breadcrumbs */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Breadcrumbs aria-label="breadcrumb">
                        <Link color="inherit" onClick={handleBack} sx={{ cursor: 'pointer' }}>
                            USSD Flows
                        </Link>
                        <Typography color="text.primary">{flow.appName || id}</Typography>
                    </Breadcrumbs>
                    <Typography variant="h4" mt={1}>{flow.appName || id}</Typography>
                </Box>
                <Box>
                    {tabValue === 0 && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={saving || !hasUnsavedChanges()}
                            sx={{ mr: 1 }}
                        >
                            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Flow information */}
            <Paper sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2">Version</Typography>
                        <Typography>{flow.version || 'No version'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2">Short Code</Typography>
                        <Typography>{flow.shortCode || 'No short code'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2">Screens</Typography>
                        <Typography>{flow.screens ? Object.keys(flow.screens).length : 0} screens</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs for different views */}
            <Paper sx={{ width: '100%' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab label="JSON Editor" />
                    <Tab label="Flow Preview" />
                </Tabs>

                {/* JSON Editor Tab */}
                {tabValue === 0 && (
                    <Box p={3}>
                        {jsonError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                JSON Error: {jsonError}
                            </Alert>
                        )}
                        <Editor
                            height="600px"
                            defaultLanguage="json"
                            defaultValue={JSON.stringify(flow, null, 2)}
                            onChange={handleEditorChange}
                            options={{
                                selectOnLineNumbers: true,
                                roundedSelection: false,
                                readOnly: false,
                                cursorStyle: 'line',
                                automaticLayout: true,
                                formatOnPaste: true,
                                formatOnType: true
                            }}
                        />
                    </Box>
                )}

                {/* Flow Preview Tab */}
                {tabValue === 1 && (
                    <Box p={3}>
                        <Typography variant="h6" gutterBottom>
                            Flow Structure
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            This view shows a preview of the USSD flow structure. An interactive simulator will be implemented in a future update.
                        </Typography>

                        {flow.screens && Object.keys(flow.screens).length > 0 ? (
                            <Box>
                                {Object.entries(flow.screens).map(([screenId, screen]) => (
                                    <Paper key={screenId} sx={{ p: 2, mb: 2, backgroundColor: screenId === 'welcome' ? '#f8f9fa' : undefined }}>
                                        <Typography variant="subtitle1" fontWeight={screenId === 'welcome' ? 'bold' : undefined}>
                                            Screen: {screenId}
                                            {screenId === 'welcome' && ' (Entry Point)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            Type: {screen.type}
                                        </Typography>
                                        {screen.text && (
                                            <Box mt={1} p={1} bgcolor="#f5f5f5" borderRadius={1}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                    {screen.text}
                                                </Typography>
                                            </Box>
                                        )}
                                        {screen.type === 'menu' && screen.options && (
                                            <Box mt={2}>
                                                <Typography variant="body2">Options:</Typography>
                                                <Box ml={2}>
                                                    {Object.entries(screen.options).map(([key, option]) => (
                                                        <Typography key={key} variant="body2">
                                                            {key} → {option.next}
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                        {screen.type === 'dynamic' && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                Handler: {screen.handler}
                                            </Typography>
                                        )}
                                        {screen.type === 'input' && (
                                            <Box mt={1}>
                                                {screen.validator && (
                                                    <Typography variant="body2">
                                                        Validator: {screen.validator}
                                                    </Typography>
                                                )}
                                                {screen.store && (
                                                    <Typography variant="body2">
                                                        Stores input as: {typeof screen.store === 'string' ? screen.store : JSON.stringify(screen.store)}
                                                    </Typography>
                                                )}
                                                {screen.next && (
                                                    <Typography variant="body2">
                                                        Next: {screen.next}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </Paper>
                                ))}
                            </Box>
                        ) : (
                            <Alert severity="warning">
                                This flow has no screens defined.
                            </Alert>
                        )}
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default FlowDetail;