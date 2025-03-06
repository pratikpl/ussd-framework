import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Paper,
  Box,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../utils/constants';

const Dashboard = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setStatus(res.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch system status');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, []);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={5}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            
            {status && status.system && (
              <Box>
                <Typography>
                  Platform: {status.system.platform} {status.system.arch}
                </Typography>
                <Typography>
                  Node.js: {status.system.nodeVersion}
                </Typography>
                <Typography>
                  Memory: {formatBytes(status.system.memory.used)} / {formatBytes(status.system.memory.total)} ({status.system.memory.usedPercent})
                </Typography>
                <Typography>
                  CPU Cores: {status.system.cpu.cores}
                </Typography>
                <Typography>
                  Uptime: {formatDuration(status.system.uptime.system)}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Framework Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Framework Status
            </Typography>
            
            {status && status.framework && (
              <Box>
                <Typography>
                  Flows: {status.framework.flows?.count || 0}
                </Typography>
                <Typography>
                  Helpers: {status.framework.helpers?.count || 0}
                </Typography>
                <Typography>
                  Process: {status.process?.running ? 'Running' : 'Not Running'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function to format duration
const formatDuration = (seconds) => {
  if (!seconds) return '0m';
  
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  result += `${minutes}m`;
  
  return result;
};

export default Dashboard;