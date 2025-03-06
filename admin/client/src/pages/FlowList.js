// src/pages/FlowList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../utils/constants';

const FlowList = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create flow dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowError, setNewFlowError] = useState(null);
  const [creating, setCreating] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Fetch flows on component mount
  useEffect(() => {
    fetchFlows();
  }, []);
  
  // Fetch flows from API
  const fetchFlows = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/flows`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setFlows(response.data.data);
    } catch (err) {
      console.error('Error fetching flows:', err);
      setError('Failed to fetch USSD flows. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Open create flow dialog
  const handleCreateClick = () => {
    setNewFlowName('');
    setNewFlowError(null);
    setCreateDialogOpen(true);
  };
  
  // Close create flow dialog
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };
  
  // Create new flow
  const handleCreateFlow = async () => {
    // Validate flow name
    if (!newFlowName.trim()) {
      setNewFlowError('Flow name is required');
      return;
    }
    
    // Flow name should be alphanumeric with underscores only
    if (!/^[a-zA-Z0-9_]+$/.test(newFlowName)) {
      setNewFlowError('Flow name can only contain letters, numbers, and underscores');
      return;
    }
    
    setCreating(true);
    setNewFlowError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Create a basic flow template
      const newFlow = {
        appName: newFlowName,
        version: '1.0.0',
        shortCode: '*123#',
        screens: {
          welcome: {
            type: 'menu',
            text: 'Welcome to ' + newFlowName + '\n1. Option 1\n2. Option 2\n3. Exit',
            options: {
              "1": { next: "option1" },
              "2": { next: "option2" },
              "3": { next: "exit" }
            }
          },
          option1: {
            type: 'notification',
            text: 'You selected Option 1',
            shouldClose: true
          },
          option2: {
            type: 'notification',
            text: 'You selected Option 2',
            shouldClose: true
          },
          exit: {
            type: 'notification',
            text: 'Thank you for using our service.',
            shouldClose: true
          }
        }
      };
      
      // Create the flow
      await axios.post(`${API_URL}/flows/${newFlowName}`, newFlow, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Close dialog and refresh flows
      setCreateDialogOpen(false);
      fetchFlows();
      
      // Navigate to the new flow
      navigate(`/flows/${newFlowName}`);
    } catch (err) {
      console.error('Error creating flow:', err);
      setNewFlowError(err.response?.data?.error || 'Failed to create flow');
    } finally {
      setCreating(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (flow) => {
    setFlowToDelete(flow);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setFlowToDelete(null);
  };
  
  // Delete flow
  const handleDeleteFlow = async () => {
    if (!flowToDelete) return;
    
    setDeleting(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/flows/${flowToDelete.name}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Close dialog and refresh flows
      setDeleteDialogOpen(false);
      setFlowToDelete(null);
      fetchFlows();
    } catch (err) {
      console.error('Error deleting flow:', err);
      setError('Failed to delete flow');
    } finally {
      setDeleting(false);
    }
  };
  
  // Navigate to flow detail page
  const handleViewFlow = (flowName) => {
    navigate(`/flows/${flowName}`);
  };
  
  // Navigate to flow edit page
  const handleEditFlow = (flowName) => {
    navigate(`/flows/${flowName}?edit=true`);
  };
  
  // Set a flow as active
  const handleSetActive = (flowName) => {
    // This functionality will be implemented later
    alert(`Setting ${flowName} as the active flow will be implemented in the next phase.`);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">USSD Flows</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Create New Flow
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {flows.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No USSD flows found
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Click the "Create New Flow" button to create your first USSD flow.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>App Name</TableCell>
                <TableCell>Short Code</TableCell>
                <TableCell>Screens</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flows.map((flow) => (
                <TableRow key={flow.name}>
                  <TableCell>{flow.name}</TableCell>
                  <TableCell>{flow.appName}</TableCell>
                  <TableCell>{flow.shortCode}</TableCell>
                  <TableCell>{flow.screens}</TableCell>
                  <TableCell>{flow.version}</TableCell>
                  <TableCell>{new Date(flow.updatedAt).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View">
                      <IconButton onClick={() => handleViewFlow(flow.name)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditFlow(flow.name)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Set Active">
                      <IconButton color="primary" onClick={() => handleSetActive(flow.name)}>
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDeleteClick(flow)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Create Flow Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose}>
        <DialogTitle>Create New USSD Flow</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a unique name for your new USSD flow. This name will be used to identify the flow in the system.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Flow Name"
            fullWidth
            variant="outlined"
            value={newFlowName}
            onChange={(e) => setNewFlowName(e.target.value)}
            error={!!newFlowError}
            helperText={newFlowError}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreateFlow} color="primary" disabled={creating}>
            {creating ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete USSD Flow</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the USSD flow "{flowToDelete?.appName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteFlow} color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowList;