using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

class DesktopLauncher {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);

    static string EscapeArg(string arg) {
        if (string.IsNullOrEmpty(arg)) return "\"\"";
        if (!arg.Contains(" ") && !arg.Contains("\t") && !arg.Contains("\"")) return arg;
        return "\"" + arg.Replace("\"", "\\\"") + "\"";
    }

    static int Main(string[] args) {
        string exe = @"C:\Users\LOKESH\AppData\Roaming\npm\node_modules\agent-desktop\bin\agent-desktop-win32-x64.exe";
        if (!File.Exists(exe)) {
            Console.Error.WriteLine("Error: agent-desktop binary not found at " + exe);
            return 2;
        }

        StringBuilder sb = new StringBuilder();
        sb.Append("\"").Append(exe).Append("\"");
        for (int i = 0; i < args.Length; i++) {
            sb.Append(" ").Append(EscapeArg(args[i]));
        }

        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\Default";

        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();

        const uint CREATE_NO_WINDOW = 0x08000000;
        bool success = CreateProcess(
            null,
            sb.ToString(),
            IntPtr.Zero,
            IntPtr.Zero,
            true, // inherit stdio handles
            CREATE_NO_WINDOW,
            IntPtr.Zero,
            null,
            ref si,
            out pi
        );

        if (!success) {
            int err = Marshal.GetLastWin32Error();
            Console.Error.WriteLine("CreateProcess failed with error: " + err);
            return err;
        }

        WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
        uint exitCode = 0;
        GetExitCodeProcess(pi.hProcess, out exitCode);

        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);

        return (int)exitCode;
    }
}

