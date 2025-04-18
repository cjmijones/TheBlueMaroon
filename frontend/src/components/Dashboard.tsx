import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Avatar, Button } from '@mui/material';

export default function Dashboard() {
  const { user, logout } = useAuth0();

  return (
    <Box
      sx={{
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Avatar
        alt={user?.name}
        src={user?.picture}
        sx={{ width: 100, height: 100 }}
      />
      <Typography variant="h5">{user?.name}</Typography>
      <Typography variant="body1">{user?.email}</Typography>

      <Button
        variant="outlined"
        color="secondary"
        onClick={() => logout({ returnTo: window.location.origin })}
      >
        Log Out
      </Button>
    </Box>
  );
}
