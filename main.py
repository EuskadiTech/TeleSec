import webview
import sys

if __name__ == '__main__':
    webview.create_window('TeleSec', sys._MEIPASS + '/dist/index.html')
    webview.start(ssl=False, icon="dist/icon512_maskable.png")
