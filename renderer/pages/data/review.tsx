import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Alert from "@material-ui/lab/Alert";
import CheckCircle from "@material-ui/icons/CheckCircle";
import RadioButtonUncheckedIcon from "@material-ui/icons/RadioButtonUnchecked";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import SaveIcon from "@material-ui/icons/Save";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import SearchIcon from "@material-ui/icons/Search";
import ClearIcon from "@material-ui/icons/Clear";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import FormControl from "@material-ui/core/FormControl";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import PIIWarningIcon from "../../components/pii-warning-icon";
import {
  getSentenceBatch,
  getAllUnviewedSentenceUUIDs,
  exportSentencesToFile,
  markSentencesAsViewedByUUIDs,
  getStats,
  getSettings,
  ISentence,
  putSettings,
} from "../../lib/api";
import { doesContainPersonalInformation } from "../../lib/pii";
import { formatMetadataForDisplay } from "../../lib/types";

const PER_PAGE_OPTIONS = [5, 7, 10, 15, 20];

const ReviewData = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectAllByDefault, setSelectAllByDefault] = useState(false);
  const [batchSize, setBatchSize] = useState(PER_PAGE_OPTIONS[0]);
  const [sentences, setSentences] = useState<ISentence[]>([]);
  const [idsToSubmit, setIdsToSubmit] = useState<string[]>([]);
  const [sentencesLeft, setSentencesLeft] = useState(0);
  const [dangerousSentenceIds, setDangerousSentenceIds] = useState<string[]>(
    []
  );
  const [showSelectAllDialog, setShowSelectAllDialog] = useState(false);
  const [showSelectAllUnreviewedDialog, setShowSelectAllUnreviewedDialog] =
    useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"include" | "exclude">(
    "include"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Updates batch, stats, but KEEPS checkmarks (persistent selection)
  const refreshSentences = useCallback(async () => {
    const [s, stats] = await Promise.all([
      getSentenceBatch(batchSize, searchTerm, searchMode, startDate, endDate),
      getStats(),
    ]);

    if (s.length === 0) {
      // If date filtering is active and no results, show a message instead of redirecting
      if (startDate || endDate) {
        setError(
          "No phrases found in the selected date range. Note: Date filtering only works with phrases that have metadata (e.g., from Grid 3)."
        );
        setSentences([]);
        return;
      }
      router.push("/dashboard");
      return;
    }

    setSentencesLeft(stats.unviewedSentences);

    setSentences(s);
    // Don't reset idsToSubmit - keep selections across pages
  }, [batchSize, searchTerm, searchMode, startDate, endDate]);

  // Update batch when size changes or search changes
  useEffect(() => {
    // Also runs upon mount
    // Debounce search to avoid too many queries while typing
    const timeoutId = setTimeout(
      () => {
        refreshSentences();
      },
      searchTerm ? 500 : 0
    ); // 500ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [batchSize, searchTerm, searchMode, startDate, endDate, refreshSentences]);

  // Runs upon mount
  // Gets settings
  useEffect(() => {
    getSettings().then((settings) => {
      setSelectAllByDefault(settings.defaultToAllSelected);
      setBatchSize(settings.sentencesPerPage);
    });
  }, []);

  // Selects all upon batch change
  // if selectAllByDefault is true
  useEffect(() => {
    if (selectAllByDefault) {
      setIdsToSubmit(
        sentences
          .map((s) => s.uuid)
          .filter((uuid) => !dangerousSentenceIds.includes(uuid))
      );
    }
  }, [sentences, selectAllByDefault, dangerousSentenceIds]);

  // Checks for personal information
  useEffect(() => {
    setDangerousSentenceIds(
      sentences.reduce<string[]>((accum, sentence) => {
        if (doesContainPersonalInformation(sentence.content)) {
          accum.push(sentence.uuid);
        }

        return accum;
      }, [])
    );
  }, [sentences]);

  const areAllSelected = idsToSubmit.length === sentences.length;

  const handleSendToggle = (uuid: string) => {
    setIdsToSubmit((currentIds) => {
      if (currentIds.includes(uuid)) {
        return currentIds.filter((i) => i !== uuid);
      }

      return [...currentIds, uuid];
    });
  };

  const handleExport = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      if (idsToSubmit.length === 0) {
        setError("Please select at least one phrase to export.");
        setIsLoading(false);
        return;
      }

      const filePath = await exportSentencesToFile(idsToSubmit);
      setSuccess(
        `Successfully exported ${idsToSubmit.length} phrases to ${filePath}`
      );

      // Mark only the exported sentences as viewed
      await markSentencesAsViewedByUUIDs(idsToSubmit);

      // Clear the exported IDs from selection
      setIdsToSubmit([]);

      // Refresh to get new sentences
      await refreshSentences();
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      // Don't show error if user cancelled the export dialog
      if (
        !errorMessage.includes("Export cancelled") &&
        !errorMessage.includes("cancelled")
      ) {
        setError(
          `An error occurred. Please try again later. (${errorMessage})`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPage = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      // Mark current page as viewed and move to next
      await markSentencesAsViewedByUUIDs(sentences.map((s) => s.uuid));

      // Remove skipped sentences from selection
      const skippedIds = sentences.map((s) => s.uuid);
      setIdsToSubmit((current) =>
        current.filter((id) => !skippedIds.includes(id))
      );

      await refreshSentences();
    } catch (error: unknown) {
      setError(
        `An error occurred. Please try again later. (${
          (error as Error).message
        })`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    // Just move to next page without marking as viewed
    await refreshSentences();
  };

  const handleSelectAll = () => {
    if (areAllSelected) {
      setIdsToSubmit([]);
    } else {
      // Show confirmation dialog before selecting all
      setShowSelectAllDialog(true);
    }
  };

  const confirmSelectAll = () => {
    setIdsToSubmit(sentences.map((s) => s.uuid));
    setShowSelectAllDialog(false);
  };

  const handleSelectAllUnreviewed = () => {
    setShowSelectAllUnreviewedDialog(true);
  };

  const confirmSelectAllUnreviewed = async () => {
    setShowSelectAllUnreviewedDialog(false);
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const allUnviewedUUIDs = await getAllUnviewedSentenceUUIDs(
        searchTerm,
        searchMode,
        startDate,
        endDate
      );

      if (allUnviewedUUIDs.length === 0) {
        setSuccess("No unreviewed phrases to export.");
        setIsLoading(false);
        return;
      }

      const filePath = await exportSentencesToFile(allUnviewedUUIDs);
      setSuccess(
        `Successfully exported ${allUnviewedUUIDs.length} phrases to ${filePath}`
      );

      // Mark all as viewed and refresh
      await markSentencesAsViewedByUUIDs(allUnviewedUUIDs);
      await refreshSentences();
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      // Don't show error if user cancelled the export dialog
      if (
        !errorMessage.includes("Export cancelled") &&
        !errorMessage.includes("cancelled")
      ) {
        setError(
          `An error occurred. Please try again later. (${errorMessage})`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const persistBatchSize = async (size: number) => {
    setBatchSize(size);

    await putSettings({ sentencesPerPage: size });
  };

  return (
    <Grid container spacing={5}>
      <Grid item xs={12}>
        <Typography variant="h2">Review sentences</Typography>
      </Grid>

      <Grid item xs={12}>
        <Paper elevation={1}>
          <Box p={2}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Search phrases"
                  placeholder="Enter search term..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm("")}
                        >
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    value={searchMode}
                    onChange={(e) =>
                      setSearchMode(e.target.value as "include" | "exclude")
                    }
                  >
                    <FormControlLabel
                      value="include"
                      control={<Radio color="primary" />}
                      label="Include matching"
                    />
                    <FormControlLabel
                      value="exclude"
                      control={<Radio color="secondary" />}
                      label="Exclude matching"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: startDate && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setStartDate("")}
                        >
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: endDate && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setEndDate("")}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              {(startDate || endDate) && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    📅 Filtering by date range (based on when phrases were
                    spoken)
                    {!startDate &&
                      " - showing all phrases before " +
                        new Date(endDate).toLocaleDateString()}
                    {!endDate &&
                      startDate &&
                      " - showing all phrases after " +
                        new Date(startDate).toLocaleDateString()}
                    {startDate &&
                      endDate &&
                      " - showing phrases between " +
                        new Date(startDate).toLocaleDateString() +
                        " and " +
                        new Date(endDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
      </Grid>

      {error !== "" && (
        <Grid item>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      {success !== "" && (
        <Grid item>
          <Alert severity="success">{success}</Alert>
        </Grid>
      )}

      <Grid item container spacing={2}>
        <Grid item>
          <Button
            color="primary"
            startIcon={
              areAllSelected ? <CheckCircle /> : <RadioButtonUncheckedIcon />
            }
            onClick={handleSelectAll}
          >
            Select All on Page
          </Button>
        </Grid>

        <Grid item>
          <Button
            color="secondary"
            variant="outlined"
            onClick={handleSelectAllUnreviewed}
            disabled={isLoading}
          >
            Select All Without Reviewing ({sentencesLeft} phrases)
          </Button>
        </Grid>

        <Grid item style={{ marginLeft: "auto" }}>
          <Typography variant="subtitle2">{sentencesLeft} left</Typography>
        </Grid>
      </Grid>
      {sentences.map((sentence) => (
        <Grid item key={sentence.uuid} xs={12}>
          <Box py={2}>
            <Paper elevation={1}>
              <Box px={2}>
                <Grid container alignItems="center" spacing={3}>
                  <Grid item xs="auto">
                    <Button
                      variant={
                        idsToSubmit.includes(sentence.uuid)
                          ? "contained"
                          : "outlined"
                      }
                      color="primary"
                      startIcon={
                        idsToSubmit.includes(sentence.uuid) ? (
                          <CheckBoxIcon />
                        ) : (
                          <CheckBoxOutlineBlankIcon />
                        )
                      }
                      onClick={() => handleSendToggle(sentence.uuid)}
                    >
                      {idsToSubmit.includes(sentence.uuid)
                        ? "Selected"
                        : "Select"}
                    </Button>
                  </Grid>

                  <Grid item xs={10}>
                    <Typography variant="body1">{sentence.content}</Typography>
                    {sentence.metadata && sentence.metadata.length > 0 && (
                      <Box mt={0.5}>
                        <Typography variant="caption" color="textSecondary">
                          {(() => {
                            const meta = formatMetadataForDisplay(
                              sentence.metadata
                            );
                            const parts = [];

                            // Time information
                            if (meta.count > 1) {
                              parts.push(`Said ${meta.count} times`);
                            } else {
                              parts.push("Said once");
                            }

                            // Most recent time with subtle formatting
                            if (meta.lastSaid) {
                              const timeStr = meta.lastSaid.toLocaleString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              );
                              parts.push(`🕐 ${timeStr}`);
                            }

                            // Location information (most recent)
                            if (meta.mostRecentLocation) {
                              const { latitude, longitude } =
                                meta.mostRecentLocation;
                              // Format coordinates to 4 decimal places for subtlety
                              const latStr = latitude.toFixed(4);
                              const lonStr = longitude.toFixed(4);
                              parts.push(`📍 ${latStr}, ${lonStr}`);
                            }

                            // Source app
                            if (sentence.source) {
                              parts.push(`${sentence.source}`);
                            }

                            return parts.join(" • ");
                          })()}
                        </Typography>
                      </Box>
                    )}
                  </Grid>

                  {dangerousSentenceIds.includes(sentence.uuid) && (
                    <Grid item xs="auto">
                      <PIIWarningIcon />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Paper>
          </Box>
        </Grid>
      ))}

      <Grid item container xs={12} spacing={2}>
        <Grid item>
          <Button
            disabled={isLoading || idsToSubmit.length === 0}
            startIcon={<SaveIcon />}
            color="primary"
            variant="contained"
            onClick={handleExport}
          >
            Export Selected{" "}
            {idsToSubmit.length > 0 && `(${idsToSubmit.length})`}
          </Button>
        </Grid>

        <Grid item>
          <Button
            disabled={isLoading}
            startIcon={<SkipNextIcon />}
            color="default"
            variant="outlined"
            onClick={handleNextPage}
          >
            Next Page
          </Button>
        </Grid>

        <Grid item>
          <Button
            disabled={isLoading}
            color="secondary"
            variant="outlined"
            onClick={handleSkipPage}
          >
            Skip Page & Next
          </Button>
        </Grid>

        <Grid
          item
          style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}
        >
          <Select
            labelId="per-page-select-label"
            style={{ marginRight: "0.5rem" }}
            value={batchSize}
            onChange={(e) => persistBatchSize(e.target.value as number)}
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <MenuItem value={option} key={option}>
                {option}
              </MenuItem>
            ))}
          </Select>

          <Typography>per page</Typography>
        </Grid>
      </Grid>

      <Dialog
        open={showSelectAllDialog}
        onClose={() => setShowSelectAllDialog(false)}
        aria-labelledby="select-all-dialog-title"
        aria-describedby="select-all-dialog-description"
      >
        <DialogTitle id="select-all-dialog-title">
          Select All Phrases on Page?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="select-all-dialog-description">
            Are you sure you want to select all {sentences.length} phrases on
            this page for export? You can review and deselect individual phrases
            before exporting.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSelectAllDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={confirmSelectAll}
            color="primary"
            variant="contained"
          >
            Select All
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showSelectAllUnreviewedDialog}
        onClose={() => setShowSelectAllUnreviewedDialog(false)}
        aria-labelledby="select-all-unreviewed-dialog-title"
        aria-describedby="select-all-unreviewed-dialog-description"
      >
        <DialogTitle id="select-all-unreviewed-dialog-title">
          Export All Unreviewed Phrases?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="select-all-unreviewed-dialog-description">
            <strong>Warning:</strong> This will export ALL {sentencesLeft}{" "}
            unreviewed phrases without giving you a chance to review them
            individually.
            <br />
            <br />
            This means you won&apos;t be able to check for:
            <ul>
              <li>Personal information (names, addresses, phone numbers)</li>
              <li>Sensitive content you may not want to share</li>
              <li>Test phrases or gibberish</li>
            </ul>
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowSelectAllUnreviewedDialog(false)}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmSelectAllUnreviewed}
            color="secondary"
            variant="contained"
          >
            Yes, Export All Without Reviewing
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

ReviewData.breadcrumb = {
  name: "Dashboard",
  href: "/dashboard",
};

export default ReviewData;
