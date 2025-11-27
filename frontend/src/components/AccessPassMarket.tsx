import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWriteContract } from 'wagmi'

const API = 'http://localhost:4000'

// Mock ABI for AccessPassNFT (ERC1155)
const passABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "redeem", // We added a 'redeem' wrapper in the contract that calls burn
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

interface AccessPass {
    _id: string
    passType: number
    amount: number
    tokenId: string
    isRedeemed: boolean
}

export function AccessPassMarket() {
    const { address, getAuthHeaders } = useAuth()
    const { writeContractAsync } = useWriteContract()
    const [passes, setPasses] = useState<AccessPass[]>([])
    const [isRedeeming, setIsRedeeming] = useState(false)

    // Contract Address from .env
    const contractAddress = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as `0x${string}`

    useEffect(() => {
        if (address) loadPasses()
    }, [address])

    const loadPasses = async () => {
        try {
            const res = await fetch(`${API}/api/access-pass?studentAddress=${address}`, { headers: getAuthHeaders() })
            if (res.ok) setPasses(await res.json())
        } catch (error) {
            console.error('Failed to load passes', error)
        }
    }

    const handleRedeem = async (pass: AccessPass) => {
        const passName = getPassName(pass.passType)
        if (!confirm(`确定要兑换"${passName}"通行证吗？\n\n兑换后该通行证将被销毁，无法恢复。`)) return

        setIsRedeeming(true)
        try {
            // 1. 在区块链上销毁通行证
            console.log('兑换通行证，tokenId:', pass.tokenId, '类型:', typeof pass.tokenId)

            // 确保tokenId是数字类型
            const tokenIdNum = typeof pass.tokenId === 'string' ?
                parseInt(pass.tokenId) : pass.tokenId;

            if (isNaN(tokenIdNum)) {
                throw new Error('通行证TokenID格式无效');
            }

            console.log('转换后的tokenId:', tokenIdNum)

            const hash = await writeContractAsync({
                address: contractAddress,
                abi: passABI,
                functionName: 'redeem',
                args: [BigInt(tokenIdNum), BigInt(1)],
            })

            console.log('兑换成功:', hash)

            // 更新后端数据库状态
            console.log('更新后端兑换状态...')
            const response = await fetch(`${API}/api/access-pass/${pass._id}/redeem`, {
                method: 'POST',
                headers: getAuthHeaders()
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('后端更新失败:', errorText)
                // 即使后端更新失败，区块链交易已经成功，所以仍然提示成功
                alert(`"${passName}"通行证已在区块链上兑换成功！\n\n但数据库状态更新失败，请联系教师手动确认。`)
            } else {
                const result = await response.json()
                console.log('后端更新成功:', result)
                alert(`"${passName}"通行证兑换成功！\n\n请将此交易记录展示给教师以获得相应权限。`)
            }

            loadPasses() // 刷新列表
        } catch (error: any) {
            console.error('兑换失败:', error)
            alert(`兑换失败: ${error.message}`)
        } finally {
            setIsRedeeming(false)
        }
    }

    const getPassName = (type: number) => {
        switch (type) {
            case 1: return '教师办公室预约券'
            case 2: return '实验室访问权限'
            case 3: return '工作坊参与券'
            default: return '未知通行证'
        }
    }

    const getPassDescription = (type: number) => {
        switch (type) {
            case 1: return '预约教师办公室时间，进行一对一咨询'
            case 2: return '访问实验室设备，进行实验操作'
            case 3: return '参与专业工作坊，获得实践指导'
            default: return '特殊权限通行证'
        }
    }

    const getPassIcon = (type: number) => {
        switch (type) {
            case 1: return '📅'
            case 2: return '🔬'
            case 3: return '🎓'
            default: return '🎫'
        }
    }

    return (
        <div className="market-container">
            <div className="market-header">
                <div className="header-icon">🎟️</div>
                <div className="header-content">
                    <h2>权益市场</h2>
                    <p>兑换您的通行证，获得学习特权和资源访问权限</p>
                </div>
            </div>

            <div className="market-intro">
                <div className="intro-card">
                    <div className="intro-icon">💡</div>
                    <div className="intro-content">
                        <h3>通行证权益说明</h3>
                        <p>通过优秀表现获得的数字通行证，可以兑换教师咨询、实验室访问、工作坊参与等特权。每个通行证都是独特的NFT，具有唯一的所有权证明。</p>
                    </div>
                </div>
            </div>

            <div className="passes-section">
                <div className="section-header">
                    <h3>我的通行证</h3>
                    <div className="passes-count">
                        <span className="count-badge">{passes.filter(p => !p.isRedeemed).length}</span>
                        <span className="count-label">个可用</span>
                    </div>
                </div>

                {passes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🎟️</div>
                        <h4>暂无通行证</h4>
                        <p>继续努力学习，获得教师颁发的通行证奖励！</p>
                    </div>
                ) : (
                    <div className="passes-grid">
                        {passes.map(pass => (
                            <div
                                key={pass._id}
                                className={`pass-card ${pass.isRedeemed ? 'redeemed' : ''}`}
                            >
                                <div className="pass-header">
                                    <div className="pass-icon">{getPassIcon(pass.passType)}</div>
                                    {pass.isRedeemed && (
                                        <div className="redeemed-badge">
                                            <span className="badge-icon">🔥</span>
                                            <span className="badge-text">已兑换</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pass-content">
                                    <h4>{getPassName(pass.passType)}</h4>
                                    <p className="pass-description">{getPassDescription(pass.passType)}</p>
                                    <div className="pass-meta">
                                        <div className="meta-item">
                                            <span className="meta-label">数量：</span>
                                            <span className="meta-value">{pass.amount}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-label">Token ID：</span>
                                            <code className="meta-value">#{pass.tokenId}</code>
                                        </div>
                                    </div>
                                </div>

                                <div className="pass-actions">
                                    <button
                                        onClick={() => handleRedeem(pass)}
                                        disabled={isRedeeming || pass.isRedeemed}
                                        className={`redeem-button ${isRedeeming ? 'loading' : ''} ${pass.isRedeemed ? 'disabled' : ''}`}
                                    >
                                        <span className="button-icon">
                                            {isRedeeming ? '⏳' : pass.isRedeemed ? '✅' : '🔥'}
                                        </span>
                                        <span className="button-text">
                                            {isRedeeming ? '兑换中...' : pass.isRedeemed ? '已兑换' : '兑换通行证'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="market-info">
                <div className="info-section">
                    <h4>兑换说明</h4>
                    <div className="info-items">
                        <div className="info-item">
                            <div className="item-icon">🔥</div>
                            <div className="item-content">
                                <h5>永久销毁</h5>
                                <p>兑换后通行证将被销毁，确保权益的唯一性和稀缺性</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <div className="item-icon">👨‍🏫</div>
                            <div className="item-content">
                                <h5>教师验证</h5>
                                <p>请将交易记录展示给教师以获得相应权限和服务</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <div className="item-icon">🔗</div>
                            <div className="item-content">
                                <h5>区块链记录</h5>
                                <p>每次兑换都会在区块链上永久记录，公开透明</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
