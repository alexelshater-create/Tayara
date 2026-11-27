// ================= the loading screen between the menu and a mode (boot.js draws it) =================
// Every mode opens behind a picture of a character, like GTA: fade to black, the picture, the mode starts behind it
// (first frames and shaders are made while it's up), then a fade into the game. Going back to the menu fades too.
const _startModeNow = startMode;
startMode = function(id){
  if (isTouch && !document.fullscreenElement) try { goFull(); } catch (e){}   // needs the tap, so before the wait
  if (id === 'story') BOOT.S.storyArt = 'tayara';   // later: the chapter's own character
  BOOT.showLoader(BOOT.artFor(id), () => {
    try { _startModeNow(id); } catch (e){ console.error(e); }
    renderer.compile(scene, camera);
    BOOT.hideLoader(1600);
  });
};
const _openMenuNow = openMenu;
openMenu = function(){ BOOT.fade(() => { _openMenuNow(); BOOT.showMenu(); }, 380); };
