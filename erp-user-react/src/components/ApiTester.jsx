"use client"

import { useState } from "react"

const ApiTester = () => {
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://192.168.0.101:8080/api/user-profiles/all")
      const data = await response.json()

      console.log("🧪 API Test Results:")
      console.log("Raw response:", data)

      // Find user with photo
      const userWithPhoto = data.find((user) => user.photo)
      if (userWithPhoto) {
        console.log("👤 User with photo found:", userWithPhoto.name)
        console.log("📸 Photo data type:", typeof userWithPhoto.photo)
        console.log("📸 Photo data:", userWithPhoto.photo)

        if (Array.isArray(userWithPhoto.photo)) {
          console.log("📊 Photo array length:", userWithPhoto.photo.length)
          console.log("📊 First 10 bytes:", userWithPhoto.photo.slice(0, 10))
        }
      } else {
        console.log("❌ No users with photo data found")
      }

      setApiData(data)
    } catch (error) {
      console.error("❌ API test failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 border rounded shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">API Tester</h3>
      <button
        onClick={testApi}
        disabled={loading}
        className="px-3 py-1 bg-green-500 text-white rounded text-sm disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test API"}
      </button>
      {apiData && (
        <div className="mt-2 text-xs">
          <p>Users found: {apiData.length}</p>
          <p>Users with photos: {apiData.filter((u) => u.photo).length}</p>
        </div>
      )}
    </div>
  )
}

export default ApiTester
