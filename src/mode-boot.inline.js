(function () {
try {
var stored = localStorage.getItem('ks-mode');
var dark =
stored === 'dark' || stored === 'light'
? stored === 'dark'
: window.matchMedia('(prefers-color-scheme: dark)').matches;
if (dark) document.documentElement.classList.add('u-dark');
var meta = document.querySelector('meta[name="theme-color"]');
if (!meta) {
meta = document.createElement('meta');
meta.setAttribute('name', 'theme-color');
document.head.appendChild(meta);
}
meta.setAttribute('content', dark ? '#0d1826' : '#fff');
} catch (e) {
}
})();