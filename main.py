import webview

if __name__ == '__main__':
    webview.create_window('TeleSec', 'dist/index.html')
    # HTTP server is started automatically for local relative paths
    webview.start(ssl=True, icon="dist/icon512_maskable.png")
