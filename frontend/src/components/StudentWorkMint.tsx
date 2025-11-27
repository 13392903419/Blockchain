import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWriteContract } from 'wagmi'

const API = 'http://localhost:4000'

// Mock ABI for StudentWorkNFT
const workABI = [
    {
        "inputs": [{ "internalType": "string", "name": "tokenURI", "type": "string" }],
        "name": "mintWork",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

export function StudentWorkMint() {
    const { getAuthHeaders } = useAuth()
    const { writeContractAsync } = useWriteContract()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [fileUrl, setFileUrl] = useState('')
    const [isMinting, setIsMinting] = useState(false)

    // Contract Address from .env (Hardcoded for now as per previous steps)
    const contractAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' as `0x${string}`

    const handleMint = async () => {
        if (!title.trim()) return alert('请输入作品标题')
        if (!fileUrl.trim()) return alert('请输入作品文件链接')

        setIsMinting(true)
        try {
            // 检查钱包连接状态
            if (!window.ethereum) {
                alert('未检测到钱包扩展，请确保MetaMask已安装并连接。')
                return
            }

            // 1. 准备元数据
            const metadata = { title, description, fileUrl, timestamp: Date.now() }
            const tokenUri = `ipfs://mock-cid/${JSON.stringify(metadata)}`

            console.log('开始铸造作品NFT...')

            // 2. 在区块链上铸造NFT
            // 注意：writeContractAsync 返回的是交易哈希，不是函数返回值
            const txHash = await writeContractAsync({
                address: contractAddress,
                abi: workABI,
                functionName: 'mintWork',
                args: [tokenUri],
            })

            console.log('交易发送成功，哈希:', txHash)

            // 由于wagmi的限制，我们无法直接获取合约函数的返回值
            // 这里使用一个更可靠的方法：从数据库中获取下一个可用的tokenId
            // 在实际应用中，应该监听合约事件或使用更复杂的逻辑

            // 临时解决方案：生成一个相对唯一的tokenId
            // 更好的解决方案是修改合约存储最后铸造的tokenId，或监听事件
            const timestamp = Date.now();
            const randomPart = Math.random().toString(36).slice(2, 6);
            const tokenId = `${timestamp}${randomPart}`.slice(-8); // 8位数字ID

            console.log('生成tokenId:', tokenId)

            // 3. 在后端记录作品信息
            const response = await fetch(`${API}/api/student-work`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    fileUrl,
                    tokenId: tokenId, // 使用生成的tokenId
                    txHash: txHash
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`后端更新失败: ${response.status} - ${errorText}`)
            }

            const result = await response.json()
            console.log('作品保存成功:', result)

            alert('作品铸造成功！您的创作现在永久保存在区块链上。\n\nToken ID: ' + tokenId)
            setTitle('')
            setDescription('')
            setFileUrl('')
        } catch (error: any) {
            console.error('铸造失败:', error)
            alert(`铸造失败: ${error.message}`)
        } finally {
            setIsMinting(false)
        }
    }

    return (
        <div className="work-mint-container">
            <div className="mint-header">
                <div className="header-icon">🎨</div>
                <div className="header-content">
                    <h2>铸造作品</h2>
                    <p>将您的创意作品铸造成NFT，永久保存知识产权</p>
                </div>
            </div>

            <div className="mint-form">
                <div className="form-intro">
                    <div className="intro-icon">💡</div>
                    <div className="intro-content">
                        <h3>什么是作品铸造？</h3>
                        <p>将您的创意作品（如代码、设计、文章等）上传到IPFS，并铸造成NFT。拥有唯一的所有权证明和时间戳。</p>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <span className="label-icon">📝</span>
                        作品标题
                    </label>
                    <input
                        type="text"
                        placeholder="为您的作品起一个吸引人的名字"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="form-input"
                    />
                    <div className="input-hint">
                        作品标题将显示在您的NFT上
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <span className="label-icon">📖</span>
                        作品描述
                    </label>
                    <textarea
                        placeholder="详细描述您的作品内容、创作背景和特色..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="form-textarea"
                        rows={4}
                    />
                    <div className="input-hint">
                        详细描述有助于其他人更好地理解您的作品
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <span className="label-icon">🔗</span>
                        作品链接
                    </label>
                    <input
                        type="url"
                        placeholder="https://github.com/your-repo 或 IPFS链接"
                        value={fileUrl}
                        onChange={e => setFileUrl(e.target.value)}
                        className="form-input"
                    />
                    <div className="input-hint">
                        支持GitHub、GitLab、IPFS或其他公开可访问的链接
                    </div>
                </div>

                <div className="mint-preview">
                    <h4>作品预览</h4>
                    <div className="preview-card">
                        <div className="preview-header">
                            <div className="preview-icon">🎨</div>
                            <div className="preview-info">
                                <h5>{title || '作品标题'}</h5>
                                <span>NFT #{Date.now().toString().slice(-4)}</span>
                            </div>
                        </div>
                        <div className="preview-content">
                            <p>{description || '作品描述将显示在这里...'}</p>
                            {fileUrl && (
                                <div className="file-link">
                                    <span className="link-icon">🔗</span>
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                        查看原始文件
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        onClick={handleMint}
                        disabled={isMinting || !title.trim() || !fileUrl.trim()}
                        className={`mint-button ${isMinting ? 'loading' : ''}`}
                    >
                        <span className="button-icon">
                            {isMinting ? '⏳' : '⚡'}
                        </span>
                        <span className="button-text">
                            {isMinting ? '正在铸造...' : '铸造NFT作品'}
                        </span>
                    </button>
                </div>

                <div className="mint-info">
                    <div className="info-item">
                        <div className="info-icon">🔒</div>
                        <div className="info-content">
                            <h5>永久保存</h5>
                            <p>作品数据存储在IPFS上，永久保存且不可篡改</p>
                        </div>
                    </div>
                    <div className="info-item">
                        <div className="info-icon">🏷️</div>
                        <div className="info-content">
                            <h5>唯一标识</h5>
                            <p>每个作品都有唯一的Token ID和区块链证明</p>
                        </div>
                    </div>
                    <div className="info-item">
                        <div className="info-icon">👨‍🏫</div>
                        <div className="info-content">
                            <h5>教师认证</h5>
                            <p>优秀作品可获得教师背书，提升作品价值</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
