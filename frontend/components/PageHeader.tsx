type PageHeaderProps = {
  title?: string;
  copy?: string;
}

export default function PageHeader({title = '', copy = ''}: PageHeaderProps) {
    return (
        <div className="container flex max-lg:flex-col py-24 gap-x-20 gap-y-10">
            {title &&
                <h1 className="flex-1 text-3xl md:text-5xl xl:text-6xl leading-[1.2] font-bold">{title}</h1>
            }
            {copy &&
                <p className="flex-1 text-lg">{copy}</p>
            }
        </div>
    )
}
