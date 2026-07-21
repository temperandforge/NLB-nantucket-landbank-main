export default function PageHeader(props) {
    const title = props.title ?? '';
    const copy = props.copy ?? '';
    return (
        <div className="container flex flex-wrap py-24 gap-x-20 gap-y-10">
            {title &&
                <h1 className="max-w-[616px] text-3xl md:text-6xl leading-[1.2] font-bold">{title}</h1>
            }
            {copy &&
                <p className="max-w-[616px] text-lg">{copy}</p>
            }
        </div>
    )
}
