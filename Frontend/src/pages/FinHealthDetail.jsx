
<header className="fhd-header">
    <div className="fhd-heading">
        <button
            type="button"
            className="fhd-back-button"
            onClick={() => navigate('/financial-health')}
            aria-label="กลับหน้าสุขภาพการเงิน"
        >
            <ChevronLeft size={22} />
        </button>

        <div
            className="fhd-icon"
            style={{
                '--category-color': criterion.color,
                '--category-bg': criterion.background,
            }}
        >
            <Icon size={27} strokeWidth={1.8} />
        </div>

        <div className="fhd-title-content">
            <h1>{criterion.title}</h1>

            <span className="fhd-weight">
                น้ำหนักคะแนน {criterion.weight}%
            </span>
        </div>
    </div>
</header>
