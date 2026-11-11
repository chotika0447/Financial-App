import WalletCard from '../components/WalletCard'

function CompletedWallets({ wallets }) {
    return (
        <section className="completed-wallets">
            <h2 className="completed-wallets-title">กระเป๋าที่สำเร็จแล้ว</h2>
            <div className="completed-wallets-list">
                {wallets.length === 0 ? (
                    <p>ยังไม่มีกระเป๋าที่สำเร็จ</p>
                ) : (
                    wallets.map((wallet) => (
                        <WalletCard 
                        key={wallet.id} 
                        name={wallet.name}
                        target={wallet.target}
                        date={wallet.date}
                        balance={wallet.balance}
                        isCompleted={true}
                        endDate={wallet.endDate}
                        />
                    ))
                )}
            </div>
        </section>
    )
}
export default CompletedWallets