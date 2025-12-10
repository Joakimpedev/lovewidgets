# EAS CLI Explained - Simple Guide

## What is EAS CLI?

**EAS CLI** is a command-line tool that lets you:
- Build your iOS/Android apps in the cloud (from Windows!)
- Manage certificates and credentials
- Submit apps to App Store/Google Play
- All from your computer, no Mac needed

Think of it as your bridge between your code and Apple/Google's app stores.

## What Website/Account Do I Use?

You already have the account! 🎉

**EAS uses your Expo account**, which you're already logged into as:
- **Username**: `joakimpe`
- **Website**: [expo.dev](https://expo.dev) (or expo.dev in the browser)

When you run `eas login`, it will:
1. Open your browser (or use your existing login)
2. Use your Expo account credentials
3. Link EAS CLI to your Expo account

**You don't need to create a new account** - you're already set up!

## What Does Each Command Do?

### `npm install -g eas-cli`
- **What it does**: Installs the EAS CLI tool globally on your computer
- **`-g` means**: Install it globally (so you can use `eas` command anywhere)
- **Why global**: So you can run `eas` from any project folder
- **Time**: Takes 1-2 minutes

### `eas login`
- **What it does**: Logs you into EAS using your Expo account
- **How**: Uses your existing Expo login (you're already logged in as `joakimpe`)
- **What happens**: May open browser or use existing session
- **Time**: 30 seconds

### `eas whoami`
- **What it does**: Shows which Expo account you're logged into
- **Use it to**: Verify you're using the right account

## Can You Just Install It For Me?

Yes! I can run these commands for you. Would you like me to:

1. **Install EAS CLI** for you right now?
2. **Verify your login** is working?

Just say "yes" or "go ahead" and I'll do it!

## Alternative: If You Prefer to Do It Yourself

If you want to run it yourself:

1. Open PowerShell or Command Prompt
2. Run: `npm install -g eas-cli`
3. Wait for it to finish (1-2 minutes)
4. Run: `eas login`
5. It should use your existing Expo login automatically

## What Happens Next?

After installing and logging in:
- You can build iOS apps from Windows (cloud builds!)
- You can manage certificates automatically
- You can submit to App Store when ready

---

**TL;DR**: EAS CLI uses your existing Expo account (`joakimpe`). I can install it for you, or you can run the commands yourself. Your choice! 🚀

