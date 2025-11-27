import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

const API = 'http://localhost:4000'

interface Certificate {
    id: string
    name: string
    description: string
    tokenId: string
    issuedAt: string
}

interface StudentWork {
    id: string
    title: string
    description: string
    fileUrl: string
    isEndorsed: boolean
    tokenId: string
}

interface StudentPet {
    stage: number
    experience: number
}

export function Showcase() {
    const { address, getAuthHeaders } = useAuth()
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [works, setWorks] = useState<StudentWork[]>([])
    const [pet, setPet] = useState<StudentPet | null>(null)

    useEffect(() => {
        if (address) {
            fetchData()
        }
    }, [address])

    const fetchData = async () => {
        try {
            const headers = getAuthHeaders()

            // Fetch Certificates
            const certRes = await fetch(`${API}/api/certificates?studentAddress=${address}`, { headers })
            if (certRes.ok) setCertificates(await certRes.json())

            // Fetch Works
            const workRes = await fetch(`${API}/api/student-work?studentAddress=${address}`, { headers })
            if (workRes.ok) setWorks(await workRes.json())

            // Fetch Pet
            const petRes = await fetch(`${API}/api/student-pet?studentAddress=${address}`, { headers })
            if (petRes.ok) setPet(await petRes.json())

        } catch (error) {
            console.error('Failed to fetch showcase data', error)
        }
    }

    const getPetImage = (stage: number) => {
        switch (stage) {
            case 0: return '🌱'; // 种子
            case 1: return '🌿'; // 幼苗
            case 2: return '🌸'; // 花朵
            case 3: return '🥀'; // 枯萎
            default: return '❓';
        }
    }

    const getPetStageName = (stage: number) => {
        switch (stage) {
            case 0: return '种子';
            case 1: return '幼苗';
            case 2: return '花朵';
            case 3: return '枯萎';
            default: return '未知';
        }
    }

    return (
        <div className="showcase-container">
            <div className="showcase-header">
                <div className="header-icon">🎓</div>
                <div className="header-content">
                    <h2>我的展示</h2>
                    <p>展示您的学习成就和创作作品</p>
                </div>
            </div>

            {/* 成长宠物 */}
            <div className="pet-section">
                <div className="section-header">
                    <h3>🌱 成长宠物</h3>
                    <p>记录您的学习历程</p>
                </div>
                <div className="pet-card">
                    <div className="pet-display">
                        <div className="pet-emoji">{getPetImage(pet?.stage || 0)}</div>
                        <div className="pet-info">
                            <h4>学习之树</h4>
                            <div className="pet-stats">
                                <div className="stat-item">
                                    <span className="stat-label">成长阶段：</span>
                                    <span className="stat-value">{getPetStageName(pet?.stage || 0)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">经验值：</span>
                                    <span className="stat-value">{pet?.experience || 0} XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pet-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${Math.min((pet?.experience || 0) / 100 * 100, 100)}%` }}
                            ></div>
                        </div>
                        <div className="progress-text">
                            距离下一阶段还需要 {(100 - ((pet?.experience || 0) % 100))} XP
                        </div>
                    </div>
                </div>
            </div>

            {/* 证书区域 */}
            <div className="certificates-section">
                <div className="section-header">
                    <h3>🏆 荣誉证书 (SBT)</h3>
                    <p>区块链上不可篡改的成就证明</p>
                </div>
                <div className="certificates-grid">
                    {certificates.map(cert => (
                        <div key={cert.id} className="certificate-card">
                            <div className="certificate-header">
                                <div className="certificate-icon">🏆</div>
                                <div className="certificate-badge">SBT</div>
                            </div>
                            <div className="certificate-content">
                                <h4>{cert.name}</h4>
                                <p>{cert.description}</p>
                                <div className="certificate-meta">
                                    <span className="issue-date">
                                        颁发时间：{new Date(cert.issuedAt).toLocaleDateString('zh-CN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {certificates.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">🏆</div>
                            <h4>暂无证书</h4>
                            <p>继续努力，获得您的第一个荣誉证书！</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 作品区域 */}
            <div className="works-section">
                <div className="section-header">
                    <h3>🎨 我的作品 (IP)</h3>
                    <p>展示您的创意作品和知识产权</p>
                </div>
                <div className="works-grid">
                    {works.map(work => (
                        <div key={work.id} className="work-card">
                            {work.isEndorsed && (
                                <div className="endorsement-badge">
                                    <span className="badge-icon">✅</span>
                                    <span className="badge-text">已认证</span>
                                </div>
                            )}
                            <div className="work-content">
                                <h4>{work.title}</h4>
                                <p>{work.description}</p>
                                <div className="work-actions">
                                    <a
                                        href={work.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-link"
                                    >
                                        <span className="link-icon">👁️</span>
                                        查看作品
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                    {works.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">🎨</div>
                            <h4>暂无作品</h4>
                            <p>去"铸造作品"页面创建您的第一个NFT作品吧！</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
