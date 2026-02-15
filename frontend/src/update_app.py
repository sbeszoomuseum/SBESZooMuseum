#!/usr/bin/env python3

import re

# Read the file
with open('App.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add loginLoading state (if not already added)
if 'const [loginLoading, setLoginLoading] = useState(false)' not in content:
    old_state = "const [showAdminLogin, setShowAdminLogin] = useState(false);\n  const navigate = useNavigate();"
    new_state = "const [showAdminLogin, setShowAdminLogin] = useState(false);\n  const [loginLoading, setLoginLoading] = useState(false);\n  const navigate = useNavigate();"
    content = content.replace(old_state, new_state)
    print("Added loginLoading state")

# 2. Update handleAdminLogin
old_login = """  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const response = await axios.post(`${API}/admin/login`, { username, password });
      login(response.data.access_token);
      setShowAdminLogin(false);
      navigate('/admin');
    } catch (error) {
      alert('Invalid credentials');
    }
  };"""

new_login = """  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    setLoginLoading(true);
    try {
      const response = await axios.post(`${API}/admin/login`, { username, password });
      login(response.data.access_token);
      setShowAdminLogin(false);
      navigate('/admin');
    } catch (error) {
      alert('Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };"""

if old_login in content:
    content = content.replace(old_login, new_login)
    print("Updated handleAdminLogin")

# 3. Replace loading animations with Cloudinary GIF - Homepage
old_loading_animation = """          {/* Creative DNA Spinner */}
          <div className="mb-8 flex justify-center">
            <div className="dna-spinner">
              <div className="text-6xl">🧬</div>
            </div>
          </div>

          {/* Animated Text */}
          <div className="mb-4">
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>BioMuseum</h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Discovering the wonders of life...</p>
          </div>

          {/* Animated Loading Bar */}
          <div className="w-64 mx-auto mb-4">
            <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded-full overflow-hidden`}>
              <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse" 
                   style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
              </div>
            </div>
          </div>

          {/* Animated Particles */}
          <div className="flex gap-2 justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full pulse-glow"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full pulse-glow" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-green-400 rounded-full pulse-glow" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <p className={`text-sm mt-6 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Loading organisms...</p>"""

new_loading_animation = """          <div className="mb-6 flex justify-center">
            <img 
              src="https://res.cloudinary.com/dhmgyv2ps/image/upload/v1764427279/346_xhjb6z.gif" 
              alt="Loading" 
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
            />
          </div>
          <div className="mb-4">
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>BioMuseum</h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Discovering the wonders of life...</p>
          </div>
          <p className={`text-sm mt-6 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Loading organisms...</p>"""

if old_loading_animation in content:
    content = content.replace(old_loading_animation, new_loading_animation)
    print("Replaced Homepage loading animation")

# 4. Update OrganismDetail to use theme and Cloudinary GIF
old_organism_detail = """const OrganismDetail = () => {
  const { id } = useParams();
  const [organism, setOrganism] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganism();
  }, [id]);

  const fetchOrganism = async () => {
    try {
      const response = await axios.get(`${API}/organisms/${id}`);
      setOrganism(response.data);
    } catch (error) {
      console.error('Error fetching organism:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl">Loading organism details...</div>
      </div>
    );
  }"""

new_organism_detail = """const OrganismDetail = () => {
  const { id } = useParams();
  const [organism, setOrganism] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = React.useContext(ThemeContext);

  useEffect(() => {
    fetchOrganism();
  }, [id]);

  const fetchOrganism = async () => {
    try {
      const response = await axios.get(`${API}/organisms/${id}`);
      setOrganism(response.data);
    } catch (error) {
      console.error('Error fetching organism:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'} flex items-center justify-center`}>
        <div className="text-center px-4">
          <div className="mb-6 flex justify-center">
            <img 
              src="https://res.cloudinary.com/dhmgyv2ps/image/upload/v1764427279/346_xhjb6z.gif" 
              alt="Loading" 
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
            />
          </div>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading organism details...</p>
        </div>
      </div>
    );
  }"""

if old_organism_detail in content:
    content = content.replace(old_organism_detail, new_organism_detail)
    print("Updated OrganismDetail loading with theme and Cloudinary GIF")

# 5. Replace OrganismsPage loading animation
old_org_page_loading = """  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center px-4">
          <div className="text-4xl mb-4">🧬</div>
          <div className={`text-lg sm:text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Loading organisms...</div>
        </div>
      </div>
    );
  }"""

new_org_page_loading = """  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center px-4">
          <div className="mb-6 flex justify-center">
            <img 
              src="https://res.cloudinary.com/dhmgyv2ps/image/upload/v1764427279/346_xhjb6z.gif" 
              alt="Loading" 
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
            />
          </div>
          <div className={`text-lg sm:text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Loading organisms...</div>
        </div>
      </div>
    );
  }"""

if old_org_page_loading in content:
    content = content.replace(old_org_page_loading, new_org_page_loading)
    print("Replaced OrganismsPage loading animation")

# 6. Add theme support to OrganismDetail not found and update back button
old_not_found = """  if (!organism) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Organism not found</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <button
          onClick={() => navigate('/')}
          className="mb-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          ← Back to Home
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-br from-green-600 to-blue-600 text-white p-4">
            <h1 className="text-4xl font-bold mb-2">{organism.name}</h1>
            <p className="text-xl italic opacity-90">{organism.scientific_name}</p>
          </div>"""

new_not_found = """  if (!organism) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'} flex items-center justify-center`}>
        <div className="text-center px-4">
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Organism not found</h2>
          <button
            onClick={() => navigate('/')}
            className={`${isDark ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-2 rounded-lg transition-all`}
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
        <button
          onClick={() => navigate('/')}
          className={`mb-2 sm:mb-4 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-green-400' : 'bg-gray-600 hover:bg-gray-700 text-white'} px-4 py-2 rounded-lg transition-all text-sm sm:text-base`}
        >
          ← Back to Home
        </button>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl shadow-lg overflow-hidden border`}>
          {/* Header */}
          <div className={`${isDark ? 'bg-gradient-to-br from-green-800 to-green-900' : 'bg-gradient-to-br from-green-600 to-blue-600'} text-white p-4 sm:p-6`}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{organism.name}</h1>
            <p className="text-lg sm:text-xl italic opacity-90">{organism.scientific_name}</p>
          </div>"""

if old_not_found in content:
    content = content.replace(old_not_found, new_not_found)
    print("Updated OrganismDetail not found and back button with theme support")

# 7. Update OrganismDetail content cards with theme
old_cards = """          <div className="grid md:grid-cols-2 gap-4 p-4">
            {/* Left Column - Images and QR */}
            <div>
              {organism.images && organism.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">📸 Images</h3>
                  <div className="grid gap-4">
                    {organism.images.map((image, index) => (
                      <div key={index} className="flex items-center justify-center bg-gray-50 rounded-lg w-80 h-64 mx-auto">
                        <img
                          src={image}
                          alt={`${organism.name} ${index + 1}`}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {organism.qr_code_image && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">📱 QR Code</h3>
                  <div className="text-center">
                    <img
                      src={organism.qr_code_image}
                      alt="QR Code"
                      className="mx-auto mb-4 border-2 border-gray-300 rounded w-40 h-40"
                    />
                    <p className="text-sm text-gray-600">
                      Scan this QR code to share this organism with others
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Classification */}
              {organism.classification && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">🔬 Classification</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {Object.entries(organism.classification).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b last:border-b-0">
                        <span className="font-medium capitalize">{key}:</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Morphology */}
              {organism.morphology && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">🏗️ Morphology</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{organism.morphology}</p>
                  </div>
                </div>
              )}

              {/* Physiology */}
              {organism.physiology && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">⚡ Physiology</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{organism.physiology}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {organism.description && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">📝 Description</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{organism.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>"""

new_cards = """          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Left Column - Images and QR */}
            <div>
              {organism.images && organism.images.length > 0 && (
                <div className="mb-6">
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📸 Images</h3>
                  <div className="grid gap-4">
                    {organism.images.map((image, index) => (
                      <div key={index} className={`flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg w-full h-48 sm:h-64 mx-auto`}>
                        <img
                          src={image}
                          alt={`${organism.name} ${index + 1}`}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {organism.qr_code_image && (
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 sm:p-6 rounded-lg`}>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📱 QR Code</h3>
                  <div className="text-center">
                    <img
                      src={organism.qr_code_image}
                      alt="QR Code"
                      className={`mx-auto mb-4 border-2 rounded w-32 h-32 sm:w-40 sm:h-40 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    />
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Scan this QR code to share this organism with others
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4 sm:space-y-6">
              {/* Classification */}
              {organism.classification && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🔬 Classification</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    {Object.entries(organism.classification).map(([key, value]) => (
                      <div key={key} className={`flex justify-between py-2 border-b last:border-b-0 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <span className={`font-medium capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{key}:</span>
                        <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Morphology */}
              {organism.morphology && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🏗️ Morphology</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} whitespace-pre-line text-xs sm:text-sm`}>{organism.morphology}</p>
                  </div>
                </div>
              )}

              {/* Physiology */}
              {organism.physiology && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>⚡ Physiology</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} whitespace-pre-line text-xs sm:text-sm`}>{organism.physiology}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {organism.description && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📝 Description</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} whitespace-pre-line text-xs sm:text-sm`}>{organism.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>"""

if old_cards in content:
    content = content.replace(old_cards, new_cards)
    print("Updated OrganismDetail cards with theme support")

# Write back
with open('App.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nAll updates completed successfully!")
