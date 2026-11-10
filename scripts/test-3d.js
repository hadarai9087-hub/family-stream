async function search3DArt() {
  const query = "3d character animation avatar render";
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&client_id=YOUR_KEY`;
  // or test curated Unsplash 3D character IDs
  const sample3DIds = [
    "photo-1618005182384-a83a8bd57fbe", // 3D abstract digital render
    "photo-1634017839464-5c339ebe3cb4", // 3D character robot
    "photo-1633356122544-f134324a6cee", // 3D avatar
    "photo-1635805737707-575885ab0820", // Spider-Man / comic animation
    "photo-1607604276583-eef5d076aa5f", // Anime figure
  ];
  for (const id of sample3DIds) {
    const testUrl = `https://images.unsplash.com/${id}?w=200&auto=format&fit=crop&q=80`;
    const res = await fetch(testUrl);
    console.log(id, res.status);
  }
}
search3DArt();
