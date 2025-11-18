import React from "react";
import { Typography, Paper } from "@material-ui/core";

const ConsentText = () => (
  <Paper style={{ maxHeight: "50vh", overflow: "scroll", padding: "1rem" }}>
    <Typography variant="h6" gutterBottom>
      Welcome to Baton AAC Data Export Tool
    </Typography>

    <Typography gutterBottom>
      This application helps you export and backup your AAC (Augmentative and
      Alternative Communication) text data. All data is encrypted and stored
      locally on your computer - nothing is uploaded to any server or shared
      automatically.
    </Typography>

    <Typography gutterBottom component="span">
      <b>What this tool does:</b>
      <ul>
        <li>
          Reads text files from your AAC interface (such as Dasher, Grid, or
          other communication software)
        </li>
        <li>Lets you review and select which phrases you want to export</li>
        <li>Encrypts your selected phrases locally using secure encryption</li>
        <li>
          Saves the encrypted data to a file on your computer that you control
        </li>
      </ul>
    </Typography>

    <Typography gutterBottom component="span">
      <b>Privacy and Security:</b>
      <ul>
        <li>
          <b>Local Only:</b> All encryption happens on your computer. No data is
          sent to any server or uploaded anywhere.
        </li>
        <li>
          <b>You Control Everything:</b> You choose which phrases to export,
          where to save the file, and what to do with it.
        </li>
        <li>
          <b>Secure Encryption:</b> Your data is encrypted using
          industry-standard encryption (libsodium sealed box encryption).
        </li>
        <li>
          <b>No Background Activity:</b> This application only runs when you
          open it. It does not monitor your computer or run in the background.
        </li>
      </ul>
    </Typography>

    <Typography gutterBottom component="span">
      <b>Privacy Options:</b> You can choose how much information to include
      with your exported data:
      <ol>
        <li>
          <b>None:</b> Only the text of your selected sentences is exported. No
          identifying information is included.
        </li>
        <li>
          <b>Anonymous ID:</b> An anonymous random ID is generated and included
          with your sentences. This allows you to keep track of different export
          sessions while remaining anonymous.
        </li>
        <li>
          <b>Anonymous ID + Optional Details:</b> You can optionally include
          anonymous demographic information such as age range, condition, or
          years of AAC experience. All fields are optional and anonymous.
        </li>
      </ol>
    </Typography>

    <Typography gutterBottom>
      <b>Important Privacy Note:</b> This tool includes a basic check for
      personal information (like phone numbers, email addresses, and common
      names), but it&apos;s not perfect. Please review your phrases carefully
      before exporting to ensure you&apos;re not including any private
      information you don&apos;t want in the export file.
    </Typography>

    <Typography gutterBottom component="span">
      <b>What you can do with exported data:</b>
      <ul>
        <li>Keep it as a personal backup of your AAC communication history</li>
        <li>
          Share it with researchers studying AAC interfaces (optional - your
          choice)
        </li>
        <li>Use it to transfer your data between devices</li>
        <li>Analyze your own communication patterns</li>
      </ul>
    </Typography>

    <Typography gutterBottom>
      <b>Your Rights:</b> You have complete control over this application and
      your data. You can uninstall it at any time, delete any exported files,
      and choose never to share your data with anyone. By clicking &quot;Agree
      and continue&quot;, you acknowledge that you understand how this tool
      works and that all data stays on your computer unless you choose to share
      it.
    </Typography>

    <Typography gutterBottom>
      If you have questions or feedback about this tool, please contact Will
      Wade at will.wade@thinksmartbox.com.
    </Typography>
  </Paper>
);

export default ConsentText;
