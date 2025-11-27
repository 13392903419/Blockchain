import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWriteContract } from 'wagmi'

const API = 'http://localhost:4000'

// Mock ABIs
const certABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "student", "type": "address" },
            { "internalType": "string", "name": "_tokenURI", "type": "string" }
        ],
        "name": "issueCertificate",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

const passABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "account", "type": "address" },
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "bytes", "name": "data", "type": "bytes" }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

const workABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "endorseWork",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

// Contract Addresses
const certAddress = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6' as `0x${string}`
const passAddress = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as `0x${string}`
const workAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' as `0x${string}`

export function TeacherAdvancedPanel() {
    const { getAuthHeaders } = useAuth()
    const { writeContractAsync } = useWriteContract()

    // State for Certificate
    const [certStudent, setCertStudent] = useState('')
    const [certName, setCertName] = useState('')
    const [certDesc, setCertDesc] = useState('')
    const [isIssuingCert, setIsIssuingCert] = useState(false)

    // State for Pass
    const [passStudent, setPassStudent] = useState('')
    const [passType, setPassType] = useState(1)
    const [passAmount, setPassAmount] = useState(1)
    const [isIssuingPass, setIsIssuingPass] = useState(false)

    // State for Work Endorsement
    const [works, setWorks] = useState<any[]>([])
    const [isEndorsing, setIsEndorsing] = useState(false)

    useEffect(() => {
        loadWorks()
    }, [])

    const loadWorks = async () => {
        try {
            const res = await fetch(`${API}/api/student-work`, { headers: getAuthHeaders() })
            if (res.ok) setWorks(await res.json())
        } catch (error) {
            console.error('Failed to load works', error)
        }
    }

    const handleIssueCert = async () => {
        if (!certStudent.trim()) return alert('请输入学生钱包地址')
        if (!certName.trim()) return alert('请输入证书名称')

        setIsIssuingCert(true)
        try {
            const metadata = { name: certName, description: certDesc }
            const tokenUri = `ipfs://mock-cert/${JSON.stringify(metadata)}`

            const hash = await writeContractAsync({
                address: certAddress,
                abi: certABI,
                functionName: 'issueCertificate',
                args: [certStudent as `0x${string}`, tokenUri],
            })

            const authHeaders = getAuthHeaders();
            console.log('发送证书API请求，认证头:', authHeaders);

            const response = await fetch(`${API}/api/certificates`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    studentAddress: certStudent,
                    name: certName,
                    description: certDesc,
                    tokenId: '0', // 实际应用中需要等待交易确认获取Token ID
                    txHash: hash
                })
            })

            console.log('证书API响应状态:', response.status);
            console.log('证书API响应头:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('证书API错误响应:', errorText);
                throw new Error(`后端更新失败: ${response.status} - ${errorText}`)
            }

            alert('证书颁发成功！学生可以在"我的展示"中查看证书。')
            setCertStudent('')
            setCertName('')
            setCertDesc('')
        } catch (err: any) {
            alert(`颁发失败: ${err.message}`)
        } finally {
            setIsIssuingCert(false)
        }
    }

    const handleIssuePass = async () => {
        if (!passStudent.trim()) return alert('请输入学生钱包地址')

        setIsIssuingPass(true)
        try {
            const hash = await writeContractAsync({
                address: passAddress,
                abi: passABI,
                functionName: 'mint',
                args: [passStudent as `0x${string}`, BigInt(passType), BigInt(passAmount), '0x'],
            })

            const response = await fetch(`${API}/api/access-pass`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentAddress: passStudent,
                    passType,
                    amount: passAmount,
                    tokenId: passType, // 使用真实的数字tokenId
                    txHash: hash
                })
            })

            if (!response.ok) {
                throw new Error(`后端更新失败: ${response.statusText}`)
            }

            alert('通行证颁发成功！学生可以在"权益市场"中查看和兑换通行证。')
            setPassStudent('')
        } catch (err: any) {
            alert(`颁发失败: ${err.message}`)
        } finally {
            setIsIssuingPass(false)
        }
    }

    const handleEndorse = async (work: any) => {
        if (!confirm(`确定要认证作品"${work.title}"吗？\n\n认证后该作品将获得官方认可，提升其价值和可信度。`)) return

        setIsEndorsing(true)
        try {
            // 检查Token ID是否有效
            if (!work.tokenId || work.tokenId === '0' || work.tokenId === '') {
                alert('无法认证：Token ID尚未确认，请稍后再试。')
                return
            }

            console.log('认证作品，tokenId:', work.tokenId, '类型:', typeof work.tokenId)

            // 确保tokenId是有效的数字
            const tokenIdNum = parseInt(work.tokenId.toString())
            if (isNaN(tokenIdNum)) {
                alert('无法认证：Token ID格式无效。')
                return
            }

            console.log('转换后的tokenId数字:', tokenIdNum)

            // 检查钱包连接状态
            if (!window.ethereum) {
                alert('未检测到钱包扩展，请确保MetaMask已安装并连接。')
                return
            }

            // 在区块链上进行认证
            console.log('开始调用endorseWork合约...')
            const txHash = await writeContractAsync({
                address: workAddress,
                abi: workABI,
                functionName: 'endorseWork',
                args: [BigInt(tokenIdNum)],
            })

            // 更新后端状态
            console.log('更新后端认证状态...')
            const response = await fetch(`${API}/api/student-work/${work._id}/endorse`, {
                method: 'POST',
                headers: getAuthHeaders()
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('后端更新失败:', errorText)
                throw new Error(`后端更新失败: ${response.status} - ${errorText}`)
            }

            const result = await response.json()
            console.log('后端更新成功:', result)

            alert('作品认证成功！该作品现在具有官方认可。')
            loadWorks()
        } catch (err: any) {
            alert(`认证失败: ${err.message}`)
        } finally {
            setIsEndorsing(false)
        }
    }

    return (
        <div className="advanced-container">
            <div className="advanced-header">
                <div className="header-icon">🛠️</div>
                <div className="header-content">
                    <h2>高级功能</h2>
                    <p>教师专用工具，颁发证书、通行证和认证作品</p>
                </div>
            </div>

            <div className="tools-intro">
                <div className="intro-card">
                    <div className="intro-icon">💡</div>
                    <div className="intro-content">
                        <h3>高级功能说明</h3>
                        <p>作为教师，您可以使用这些工具为优秀学生颁发数字证书、通行证，以及对学生作品进行官方认证。这些操作都会在区块链上永久记录。</p>
                    </div>
                </div>
            </div>

            <div className="tools-grid">
                {/* 颁发证书 */}
                <div className="tool-card">
                    <div className="tool-header">
                        <div className="tool-icon">🏆</div>
                        <div className="tool-info">
                            <h3>颁发证书 (SBT)</h3>
                            <p>为学生颁发不可转让的灵魂绑定代币证书</p>
                        </div>
                    </div>

                    <div className="tool-form">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">👨‍🎓</span>
                                学生钱包地址
                            </label>
                            <input
                                type="text"
                                placeholder="输入学生的以太坊地址"
                                value={certStudent}
                                onChange={e => setCertStudent(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">📜</span>
                                证书名称
                            </label>
                            <input
                                type="text"
                                placeholder="例如：优秀学生证书"
                                value={certName}
                                onChange={e => setCertName(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">📝</span>
                                证书描述
                            </label>
                            <textarea
                                placeholder="详细描述证书颁发原因和学生表现..."
                                value={certDesc}
                                onChange={e => setCertDesc(e.target.value)}
                                className="form-textarea"
                                rows={3}
                            />
                        </div>

                        <button
                            onClick={handleIssueCert}
                            disabled={isIssuingCert || !certStudent.trim() || !certName.trim()}
                            className={`tool-button ${isIssuingCert ? 'loading' : ''}`}
                        >
                            <span className="button-icon">{isIssuingCert ? '⏳' : '🏆'}</span>
                            <span className="button-text">
                                {isIssuingCert ? '颁发中...' : '颁发证书'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 颁发通行证 */}
                <div className="tool-card">
                    <div className="tool-header">
                        <div className="tool-icon">🎟️</div>
                        <div className="tool-info">
                            <h3>颁发通行证</h3>
                            <p>为学生发放访问实验室、预约咨询等权限</p>
                        </div>
                    </div>

                    <div className="tool-form">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">👨‍🎓</span>
                                学生钱包地址
                            </label>
                            <input
                                type="text"
                                placeholder="输入学生的以太坊地址"
                                value={passStudent}
                                onChange={e => setPassStudent(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">🎫</span>
                                通行证类型
                            </label>
                            <select
                                value={passType}
                                onChange={e => setPassType(Number(e.target.value))}
                                className="form-select"
                            >
                                <option value={1}>教师办公室预约券</option>
                                <option value={2}>实验室访问权限</option>
                                <option value={3}>工作坊参与券</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">🔢</span>
                                数量
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={passAmount}
                                onChange={e => setPassAmount(Number(e.target.value))}
                                className="form-input"
                            />
                        </div>

                        <button
                            onClick={handleIssuePass}
                            disabled={isIssuingPass || !passStudent.trim()}
                            className={`tool-button ${isIssuingPass ? 'loading' : ''}`}
                        >
                            <span className="button-icon">{isIssuingPass ? '⏳' : '🎟️'}</span>
                            <span className="button-text">
                                {isIssuingPass ? '颁发中...' : '颁发通行证'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 作品认证 */}
            <div className="endorsement-section">
                <div className="section-header">
                    <h3>🎨 作品认证</h3>
                    <p>为优秀的学生作品进行官方认证，提升作品价值</p>
                </div>

                <div className="works-list">
                    {works.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🎨</div>
                            <h4>暂无待认证作品</h4>
                            <p>学生铸造作品后，您可以在这里进行认证</p>
                        </div>
                    ) : (
                        works.map(work => (
                            <div key={work._id} className={`work-item ${work.isEndorsed ? 'endorsed' : ''}`}>
                                <div className="work-info">
                                    <div className="work-header">
                                        <h4>{work.title}</h4>
                                        {work.isEndorsed && (
                                            <div className="endorsed-badge">
                                                <span className="badge-icon">✅</span>
                                                <span className="badge-text">已认证</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="work-meta">
                                        <span className="student-address">
                                            学生: {work.studentAddress.slice(0, 6)}...{work.studentAddress.slice(-4)}
                                        </span>
                                        <span className="work-date">
                                            提交时间: {new Date(work.createdAt || Date.now()).toLocaleDateString('zh-CN')}
                                        </span>
                                    </div>
                                    <p className="work-description">{work.description}</p>
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
                                <div className="work-actions-main">
                                    {!work.isEndorsed ? (
                                        <button
                                            onClick={() => handleEndorse(work)}
                                            disabled={isEndorsing}
                                            className={`endorse-button ${isEndorsing ? 'loading' : ''}`}
                                        >
                                            <span className="button-icon">✨</span>
                                            <span className="button-text">
                                                {isEndorsing ? '认证中...' : '认证作品'}
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="endorsed-status">
                                            <span className="status-icon">🏆</span>
                                            <span className="status-text">已认证</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
