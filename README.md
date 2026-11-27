# SiliconGuard // Hardware Trojan & Circuit-Level Anomaly Detection Workbench

A high-contrast dark-mode semiconductor EDA workbench and digital oscilloscope simulator for real-time Hardware Trojan and side-channel anomaly detection on an 8-bit unsigned ALU.

## Features

- **5-Stage Detection Engine** (`src/engine/detectionEngine.ts`):
  - **Stage 1**: Golden Reference Model ($\mu_P$, $\mu_T$, $\sigma_P$, $\sigma_T$) with Hamming-weight dynamic power and Box-Muller wafer process noise.
  - **Stage 2**: Deterministic Logic Diff ($\Delta_L = Y_{\text{CUT}} \oplus Y_{\text{golden}}$) with bit-level register highlighting.
  - **Stage 3**: Side-Channel Residuals & Multi-Parameter Z-Score ($Z_P$, $Z_T$, $Z_{\text{multi}}$).
  - **Stage 4**: 20-Cycle Sliding-Window Drift Filter ($Z_{\text{window}}$) isolating subtle static leakage under wafer noise.
  - **Stage 5**: Verdict Classification (`PASS` / `WARNING` / `CRITICAL`) and Chip Trust Score (`0%–100%`).
- **4 Chip Under Test (CUT) Profiles**: Clean Baseline ALU, Dormant Logic Trojan (`A=0x0D, B=0x07, XOR`), Power Side-Channel Trojan (`+2.4 mW` leakage + `+6.5 mW` periodic bursts), and Path Delay Trojan (`+1.9 ns` on `SUB`).
- **Dual Synchronized Retina HTML5 Oscilloscopes**: Interactive hover/click crosshair, acceptance bands ($\pm \tau \cdot \sigma$), and live differential comparator.
- **Supabase Cloud Forensic Registry**: Save verification runs and view audit history across sessions (`public.forensic_reports`).

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com) (Vite framework preset is auto-detected: `npm run build`, output directory `dist`).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables**.
4. Deploy.
