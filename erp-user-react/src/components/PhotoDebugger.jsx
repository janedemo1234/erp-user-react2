"use client"

import { useAuth } from "../context/AuthContext"

const PhotoDebugger = () => {
  const { user } = useAuth()

  const testPhotoData = async () => {
    try {
      const response = await fetch("http://192.168.0.101:8080/api/user-profiles/all")
      const users = await response.json()
      const currentUser = users.find((u) => u.email === user?.email)

      console.log("=== PHOTO DEBUGGER ===")
      console.log("Current user from API:", currentUser)
      console.log("Photo field:", currentUser?.photo)
      console.log("Photo type:", typeof currentUser?.photo)

      if (currentUser?.photo) {
        // Try to create a test image
        const testImg = new Image()
        testImg.onload = () => console.log("Test image loaded successfully!")
        testImg.onerror = (e) => console.error("Test image failed to load:", e)

        if (typeof currentUser.photo === "string") {
          testImg.src = currentUser.photo.startsWith("data:")
            ? currentUser.photo
            : `data:image/jpeg;base64,${currentUser.photo}`
        }
      }
    } catch (error) {
      console.error("Debug fetch error:", error)
    }
  }

  if (!user) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 border rounded shadow-lg">
      <h3 className="font-bold mb-2">Photo Debug</h3>
      <p>User: {user.firstName}</p>
      <p>Has Photo: {user.photo ? "Yes" : "No"}</p>
      {user.photo && <p>Photo Length: {user.photo.length}</p>}
      <button onClick={testPhotoData} className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm">
        Test Photo Data
      </button>
    </div>
  )
}

export default PhotoDebugger
