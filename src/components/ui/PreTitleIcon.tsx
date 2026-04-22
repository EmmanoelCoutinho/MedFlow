export default function PreTitleIcon({
  icon: Icon,
}: {
  icon: React.ElementType;
}) {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
      <Icon className="h-7 w-7 text-blue-600" />
    </div>
  );
}
