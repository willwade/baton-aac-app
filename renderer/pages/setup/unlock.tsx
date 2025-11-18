import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Store from "electron-store";

const store = new Store();

const UnlockStep = () => {
  const router = useRouter();

  useEffect(() => {
    const isUnlocked = store.get("unlocked");

    if (isUnlocked) {
      router.push("/setup/1");
    }
  }, []);

  const handleUnlock = async () => {
    // No backend validation needed for local-only export
    store.set("unlocked", true);
    await router.push("/setup/1");
  };

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography variant="h2" gutterBottom>
            Welcome to Baton
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography gutterBottom>
            Baton helps you export your AAC phrases for research purposes. All
            data is encrypted locally on your computer, and you have complete
            control over when and how to share it.
          </Typography>
        </Grid>

        <Grid item>
          <Button variant="contained" color="primary" onClick={handleUnlock}>
            Get Started
          </Button>
        </Grid>
      </Grid>
    </>
  );
};

export default UnlockStep;
