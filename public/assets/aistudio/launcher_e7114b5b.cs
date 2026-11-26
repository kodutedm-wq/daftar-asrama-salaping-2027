using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Launcher
{
    [STAThread]
    private static void Main()
    {
        string root = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        string html = Path.Combine(root, "index.html");

        if (!File.Exists(html))
        {
            MessageBox.Show("Fail 'index.html' tidak dijumpai di folder ini.\n\nSila pastikan kesemua fail aplikasi berada bersama fail .exe.",
                "Pendaftaran Asrama 2027", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        string url = new Uri(html).AbsoluteUri;
        string edge = FindEdge();
        string profile = Path.Combine(root, "app-data");

        if (!string.IsNullOrEmpty(edge))
        {
            string args = "--app=\"" + url + "\""
                + " --user-data-dir=\"" + profile + "\""
                + " --window-size=1280,860"
                + " --window-position=70,50"
                + " --no-first-run"
                + " --no-default-browser-check"
                + " --disable-features=TranslateUI";
            Process.Start(new ProcessStartInfo(edge, args) { UseShellExecute = false });
        }
        else
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
    }

    private static string FindEdge()
    {
        string[] paths = {
            @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Microsoft", "Edge", "Application", "msedge.exe")
        };

        foreach (string p in paths)
        {
            if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
        }

        try
        {
            using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
            {
                if (key != null)
                {
                    object value = key.GetValue("");
                    if (value != null && File.Exists(value.ToString())) return value.ToString();
                }
            }
        }
        catch { }

        return null;
    }
}
