// Add Scene
function addScene() {
  const scenesList = document.getElementById("scenes-list");
  const sceneCount = scenesList.children.length;
  const newScene = document.createElement("li");
  newScene.className = "scene-item";
  newScene.textContent = `Scene ${sceneCount + 1}`;
  scenesList.appendChild(newScene);
}

// Add Source
function addSource() {
  const sourcesList = document.getElementById("sources-list");
  const sourceCount = sourcesList.children.length;
  const newSource = document.createElement("li");
  newSource.className = "source-item";
  newSource.innerHTML = `<input type="checkbox" checked /> Source ${sourceCount + 1}`;
  sourcesList.appendChild(newSource);
}